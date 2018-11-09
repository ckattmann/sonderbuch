import os
import json
import time
import datetime
import logging
from flask import Flask, request, jsonify
import influxdb

app = Flask(__name__)

# Load Database Credentials
with open('dbcredentials.json', 'r') as f:
    credentials = json.loads(f.read())
CLIENT = influxdb.InfluxDBClient(**credentials)

# Load all existing coordinates
try:
    with open('coordinates.json', 'r') as f:
        coordinates = json.loads(f.read())
except:
    coordinates = {}

def parse_timeInterval(timeInterval, database, measurement, firstqueryvalue):
    influxdb_time_format = '%Y-%m-%dT%H:%M:%SZ'
    if timeInterval == 'last24h':
        return 'time > now() - 24h'
    elif timeInterval == 'last7d':
        return 'time > now() - 168h'
    elif timeInterval == 'today':
        first_timestamp_today = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_today = first_timestamp_today.strftime(influxdb_time_format)
        return "time >= '"+start_of_today+"' and time < '"+start_of_today+"' + 24h" # explicit timestamp in influxdb queries have to be single-quoted
    elif timeInterval == 'thisweek':
        first_timestamp_today = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        first_timestamp_thisweek = first_timestamp_today - datetime.timedelta(days=first_timestamp_today.weekday())
        start_of_thisweek = first_timestamp_thisweek.strftime(influxdb_time_format)
        return "time >= '"+start_of_thisweek+"' and time < '"+start_of_thisweek+"' + 7d"
    elif timeInterval == 'alltime':
        CLIENT.switch_database(database)
        result = CLIENT.query('SELECT FIRST('+firstqueryvalue+') from "'+measurement+'"', epoch='ms')
        first_ts = list(result.get_points())[0]['time']
        result = CLIENT.query('SELECT LAST('+firstqueryvalue+') from "'+measurement+'"', epoch='ms')
        last_ts = list(result.get_points())[0]['time']
        return "time >= "+str(first_ts)+"ms and time < "+str(last_ts)+"ms"
    elif isinstance(timeInterval, list) and len(timeInterval) == 2:
        return "time >= "+str(int(timeInterval[0]))+"ms and time < "+str(int(timeInterval[1]))+"ms"
    else:
        parsed_timeInterval = timeInterval
    return parsed_timeInterval


def build_query_string(query_dict):
    ''' Build an IndexQL query string from the given dictionary '''

    firstqueryvalue = None
    # SELECT
    # all numeric values - group by time() and therefore mean() can be applied
    select_string = 'SELECT '
    if query_dict.get('values',False):  
        if isinstance(query_dict['values'], list):
            firstqueryvalue = query_dict['values'][0]
            selected_string = ','.join(['mean('+v+')' for v in query_dict['values']])
        elif isinstance(query_dict['values'], str):
            firstqueryvalue = query_dict['nonnumericvalues']
            selected_string = query_dict['values']
        else:
            selected_string=""
            print('selected_string', repr(query_dict['values']))
        

        select_string += selected_string
    else:
        # all non numeric values - group by time() and therefore mean() can NOT be applied!
        if query_dict.get('nonnumericvalues',False):  
            if isinstance(query_dict['nonnumericvalues'], list):
                firstqueryvalue = query_dict['nonnumericvalues'][0]
                selected_string = ','.join(query_dict['nonnumericvalues'])
            elif isinstance(query_dict['nonnumericvalues'], str):
                firstqueryvalue = query_dict['nonnumericvalues']
                selected_string = query_dict['nonnumericvalues']
            else:
                selected_string=""
                print('selected_string', repr(query_dict['nonnumericvalues']))

            select_string += selected_string

    # FROM
    from_string = 'FROM "' + query_dict['location_id'] + '"'  # Extra double quotes for location_ids that are numbers
    # WHERE
    where_string = 'WHERE ' + parse_timeInterval(query_dict['timeInterval'], query_dict['grid'], query_dict['location_id'],firstqueryvalue)
    # GROUPBY
    groupby_string = 'GROUP BY '
    # timeinterval
    if query_dict.get('values',False):
         groupby_string += 'time('+query_dict['avrgInterval']+')'
    
    # tags    
    groupbyTags = query_dict.get('groupbyTags',None)    
    if groupbyTags:
        # make a list 
        if isinstance(groupbyTags,str):
            if ',' in groupbyTags:
                groupbyTags = groupbyTags.split(',')
            else:
                groupbyTags = [groupbyTags]
        # prepend to existing group by clause
        if len(groupby_string) > 9:
            groupby_string += ","+",".join(groupbyTags)
        else:
            groupby_string += ",".join(groupbyTags) 

    query_string = ' '.join([select_string, from_string, where_string, groupby_string])

    return query_string


@app.route('/api/query', methods=['POST'])
def querydb():
    query_dict = request.get_json()
    print(query_dict)
    # Preprocess the request
    query_string = query_dict.get('querystring',None)
    values = query_dict.get('values',None)    
    nonnumericvalues = query_dict.get('nonnumericvalues',None)
    if query_string:
        try:
            query_starttime = time.time()
            CLIENT.switch_database(query_dict['grid'])
            query_result = CLIENT.query(query_string, epoch='ms')  # ms plays nicely with Dygraphs
            print('Query Time', time.time() - query_starttime)
        except influxdb.exceptions.InfluxDBClientError:
            print('Error with query string ', end='')
            print(query_string)
            raise

        # Parse Result:
        try:
            data = query_result.raw['series']
        except:
            print('Query result: ',query_result)
            print('Query result raw: ',query_result.raw)
            data = []
        return jsonify({'data':data})  
    else:
        if values:
            if isinstance(query_dict['values'], str):
                if ',' in query_dict['values']:
                    query_dict['values'] = query_dict['values'].split(',')
                else:
                    query_dict['values'] = [query_dict['values']]
        if nonnumericvalues:
            if isinstance(nonnumericvalues, str):
                if ',' in nonnumericvalues:
                    query_dict['nonnumericvalues'] = nonnumericvalues.split(',')
                else:
                    query_dict['nonnumericvalues'] = [nonnumericvalues]

        if not values and not nonnumericvalues:
            print("no values to query for!")
            #raise

        if 'avrgInterval' not in query_dict:
            query_dict['avrgInterval'] = '10m'

        # Build the query string and perform the request
        query_string = build_query_string(query_dict)
        try:
            query_starttime = time.time()
            CLIENT.switch_database(query_dict['grid'])
            query_result = CLIENT.query(query_string, epoch='ms')  # ms plays nicely with Dygraphs
            print('Query Time', time.time() - query_starttime)
        except influxdb.exceptions.InfluxDBClientError:
            print('Error with query string ', end='')
            print(query_string)
            raise

        # Parse Result:
        try:
            data = query_result.raw['series'][0]['values']
        except:
            print('Query result: ',query_result)
            print('Query result raw: ',query_result.raw)
            data = []

        labels = ['time']
        if values: 
            labels.extend(query_dict['values'])
        elif nonnumericvalues:
            labels.extend(query_dict['nonnumericvalues'])
        return jsonify({'data':data, 'labels':labels})


@app.route('/api/write', methods=['POST'])
def write_to_db():
    try:
        with open("writelog.txt","a") as f:
            #f.write("{}: IP = {}\n".format(str(datetime.datetime.now()),request.environ.get('HTTP_X_REAL_IP',request.remote_addr)))
            pass
    except:
        pass
    req = request.get_json()
    database = req['grid']
    datapoints = req['datapoints']
    if database != 'Misc':
        if database not in [d['name'] for d in CLIENT.get_list_database()]:
            # logging.debug(str(database)+' not in DB, attempting to create it')
            CLIENT.create_database(database)
            # logging.debug('Databases in DB: '+[d['name'] for d in CLIENT.get_list_database()])

        # Write data to DB
        try:
            CLIENT.write_points(datapoints, database=database, time_precision='s')
        except:
            print('Error during writing process')
            print(datapoints)
            raise

    # Additionally write latest json to file for quick retrieval of status
    # address = data['tags']['address']
    # with open()

    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}


@app.route('/api/flexibilities/available',methods=['GET'])
def get_available_flexibilities():
    status={}
    flexdb="Flexibilities"
    CLIENT.switch_database(flexdb)
    for flextype in [d['name'] for d in CLIENT.get_list_measurements()]:
        try:
            result = CLIENT.query('SELECT LAST(ip),* FROM (SELECT *,ip,flexname from "'+flextype+'" ) GROUP BY ip', epoch='ms')
            result = list(result.get_points())
            
            for res in result:
                try:
                    
                    res['settings']=json.loads(json.loads(res['settings']))
                    last=res.pop('last')
                    ggp=res['settings'].pop('gridguard_params')
                    cs=res['settings'].pop('centralserver')                    
                except:
                    pass
            status[flextype] = result 
        except:
            pass
    return jsonify({'status':status})

@app.route('/api/flexibilities/status',methods=['GET'])
def get_status_flexibilities():
    status={}
    flexdb="Flexibilities"
    CLIENT.switch_database(flexdb)
    for flextype in [d['name'] for d in CLIENT.get_list_measurements()]:
        try:
            result = CLIENT.query('SELECT LAST(ip),* FROM (SELECT *,ip,flexname from "'+flextype+'" ) GROUP BY ip,flexname', epoch='ms')
            result = list(result.get_points())
            
            for res in result:
                try:
                    
                    res['settings']=json.loads(json.loads(res['settings']))
                    last=res.pop('last')
                    ggp=res['settings'].pop('gridguard_params')
                    cs=res['settings'].pop('centralserver')                    
                except:
                    pass
            status[flextype] = result 
        except:
            pass
    return jsonify({'status':status})

@app.route('/api/status', methods=['GET'])
def get_status():
    status = {}

    available_databases = [d['name'] for d in list(CLIENT.get_list_database()) if d['name'] not in ['_internal','Sonderbuch_20180628','Flexibilities']]
    status['grids'] = {}
    t0 = time.time()
    for db in available_databases:
        t1 = time.time()
        CLIENT.switch_database(db)
        #status['time_for_switching'] = time.time() - t1
        t2 = time.time()
        status['grids'][db] = {}
        if db in coordinates.keys():
            status['grids'][db]['coordinates'] = coordinates[db]
        else:
            status['grids'][db]['coordinates'] = {'lat':None,'lng':None}
        status['grids'][db]['measurements'] = {}
        #status['time_for_coordinates'] = time.time() - t2
        for location in [d['name'] for d in CLIENT.get_list_measurements()]:
            try:
                t3 = time.time()
                result = CLIENT.query('SELECT LAST(U1), * from "'+location+'"', epoch='ms')
                t4 = time.time()
                status['get_last_values_for_' + location] = t4 - t3
                result = list(result.get_points())[0]
                t5 = time.time()
                #status['sort_result_for_' + location] = t5 - t4
                result['U1'] = result.pop('last')
                t6 = time.time()
                #status['select_last_from_dict_for_' + location] = t6 - t5
                status['grids'][db]['measurements'][location] = result
                #status['putting_in_dict_for_' + location] = time.time() - t6
            except:
                pass
        #status['total_time_measurements'] = time.time() - t1
    status['total_time_databases'] = time.time() - t0
    return jsonify({'status':status})

@app.route('/api/update', methods=['POST'])
def set_status():
    req = request.get_json()
    coordinates[req['db']] = {}
    coordinates[req['db']]['lat'] = req['lat']
    coordinates[req['db']]['lng'] = req['lng']

    with open('coordinates.json', 'w') as f:
        f.write(json.dumps(coordinates))

    return jsonify(coordinates)


if __name__ == '__main__':
    app.run(host='0.0.0.0')
