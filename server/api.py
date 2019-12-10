import os
import json
import time
import datetime
import pytz 
import logging
from flask import Flask, request, jsonify
import influxdb
import gzip
from io import BytesIO, StringIO, TextIOWrapper


this_directory = os.path.dirname(os.path.realpath(__file__))
status_directory = os.path.join(this_directory,"status")
DB_status_exceptions = [
    '_internal',
    'Sonderbuch',
    'Sonderbuch_20180628',
    'Flexibilities',
    'Sensors',
    'Showcase',
    'StateEstimation',
    'SE',
]

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

    # SELECT
    select_string = 'SELECT '
    if isinstance(query_dict['values'], list):
        selected_string = ','.join(['mean("'+v+'")' for v in query_dict['values']])
    elif isinstance(query_dict['values'], str):
        selected_string = query_dict['values']
    else:
        print('selected_string', repr(query_dict['values']))

    select_string += selected_string
    # FROM
    from_string = 'FROM "' + query_dict['location_id'] + '"'  # Extra double quotes for location_ids that are numbers
    # WHERE
    where_string = 'WHERE ' + parse_timeInterval(query_dict['timeInterval'], query_dict['grid'], query_dict['location_id'],query_dict['values'][0])
    # GROUPBY
    groupby_string = 'GROUP BY time('+query_dict['avrgInterval']+')'

    query_string = ' '.join([select_string, from_string, where_string, groupby_string])

    return query_string


@app.route('/api/query', methods=['POST'])
def querydb():
    query_dict = request.get_json()
    # Preprocess the request
    query_string = query_dict.get('querystring',None)
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
        except Exception as e:
            print(str(e))
            print('Query result: ',query_result)
            print('Query result raw: ',query_result.raw)
            return jsonify(vars(query_result))
            data = []
        return jsonify({'data':data})  
    else:
        if isinstance(query_dict['values'], str):
            if ',' in query_dict['values']:
                query_dict['values'] = query_dict['values'].split(',')
            else:
                query_dict['values'] = [query_dict['values']]

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
        labels.extend(query_dict['values'])

        return jsonify({'data':data, 'labels':labels})


@app.route('/api/write', methods=['POST'])
def write_to_db():
    # Get current time for comparison with time of measurement
    # Difference == time of communication process
    now = time.time()

    if request.content_encoding == 'gzip':
        s = BytesIO(request.get_data())
        g = gzip.GzipFile(mode='rb',fileobj=s)
        req = json.loads(g.read().decode('utf-8'))
        g.close()
    else:
        req = request.get_json()
    
    try:
        # ETH or GSM
        iface = req.get('interface',False)
        if iface:
            DBname = 'Sonderbuch'
            if DBname not in [d['name'] for d in CLIENT.get_list_database()]:
                CLIENT.create_database(DBname)

            connection_data = []
            for datapoint in req['datapoints']:
                dataTime = datapoint["time"]
                dataDB = req["grid"]
                dataMes = datapoint["measurement"]
                timedelta = now - dataTime
                dat = {
                    'grid': DBname,
                    'measurement': 'Communications',
                    'time': int(dataTime*1000),
                    'fields': {
                        'storetime':int(now*1000), # timestamp of storage in DB in ms
                        'timedelta':timedelta # timedelta between measurement and storage in DB
                    },
                    'tags': {'interface':iface,'db':dataDB,'mes':dataMes}
                }
                connection_data.append(dat) 
            CLIENT.write_points(connection_data, database=DBname, time_precision='ms')
    except Exception as e:
        print(str(e))


    database = req['grid']
    datapoints = req['datapoints']
    
    if database != 'Misc':
        if database not in [d['name'] for d in CLIENT.get_list_database()]:
            # logging.debug(str(database)+' not in DB, attempting to create it')
            CLIENT.create_database(database)
            # logging.debug('Databases in DB: '+[d['name'] for d in CLIENT.get_list_database()])

        # Write data to DB
        try:
            if database == "Showcase":
                CLIENT.write_points(datapoints, database=database, time_precision='ms')
            else:
                CLIENT.write_points(datapoints, database=database, time_precision='s')
        except Exception as e:
            print('Error during writing process')
            print(datapoints)
            #with open("log.txt","a") as f:
            #    f.write(str(e)+"\n")
            raise

    # Additionally write latest json to file for quick retrieval of status
    if not os.path.exists(status_directory):
        os.makedirs(status_directory)

    if database not in DB_status_exceptions:
        # find the latest datapoints from the list of received datapoints 
        # 2 different measurements are possible in the received datapoints
        
        # sortieren nach time und neusten auswählen
        latest_datapoint_1 = sorted(datapoints, key=lambda k: k['time'])[-1]
        mes_1 = str(latest_datapoint_1['measurement'])
        latest_datapoints = [latest_datapoint_1]

        # subset von allen datapoints erstellen die nicht vom selben measurement sind
        # subset sortieren und neustes element auswählen
        subset = [dp for dp in datapoints if dp["measurement"] != mes_1]
        sorted_subset = sorted(subset, key=lambda k: k['time'])
        if len(sorted_subset) > 0:
            latest_datapoints.append(sorted_subset[-1])

        # bisheriges status file einlesen
        
        thisfilename = os.path.join(status_directory,f'{database}.json')
        if os.path.isfile(thisfilename):
            try:
                with open(thisfilename,'r') as file:
                    db_status = json.load(file)
            except Exception as e:
                os.remove(f'{database}.json')
                db_status = {}
                db_status['measurements'] = {}
        else:    
            db_status = {}
            db_status['measurements'] = {}
        
        for latest_datapoint in latest_datapoints:
            mes = str(latest_datapoint['measurement'])
            fields = latest_datapoint['fields']
            fields.update({'time':int(latest_datapoint['time']*1000)})
            db_status['measurements'][mes] = fields

        with open(thisfilename,'w') as file:
            json.dump(db_status,file)
    elif database == "StateEstimation":
        statefilename = os.path.join(status_directory,'state_sonderbuch.json')
        #if os.path.isfile(statefilename):
        #    with open(statefilename,'r') as file:
        #        last_state = json.load(file)
        state = {}
        for datapoint in datapoints:
            thesefields = datapoint["fields"]
            thesefields.update({'time':int(datapoint['time']*1000)})
            state[datapoint["measurement"]] = thesefields

        with open(statefilename,'w') as file:
            json.dump(state,file)



    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}

@app.route('/api/sensors', methods=['POST'])
def write_sensor_data_to_db():
    database = "Sensors"
    # get the request data as json
    rdata = request.get_json(force=True)
    #with open("keys.txt","a") as f:
        #f.write("\n")
        #f.write("Received /api/sensors request: {}".format(str(rdata)))
    datapoints=[]
    fields={}
    for key,item in rdata.items():
        if key == "devaddr":
            devaddr=str(item)
        elif key == "data":
            fields[key]=str(item)
        elif key == "datetime":
            utc_tz = pytz.utc
            ger_tz = pytz.timezone('Europe/Berlin')
            # datetime is str of form: 2018-11-16T08:25:59Z
            dtime = utc_tz.normalize(utc_tz.localize(datetime.datetime.strptime(item,"%Y-%m-%dT%H:%M:%SZ"), is_dst=False))
            fields[key]=str(item)
        elif "field" in key:
            if key[-1]=="1":
                fields["temperature"]=item
            elif key[-1]=="2":
                fields["ghi"]=item
            elif key[-1]=="3":
                fields["battery"]=item/10
            else:
                fields[key]=item
        else:
            fields[key]=item
    datapoint = {
        'grid': database,
        'measurement': devaddr,
        'time': int(dtime.timestamp()),
        'fields': {str(key):item for key,item in fields.items()},
        'tags': {}
    }
    datapoints.append(datapoint)        

    if database not in [d['name'] for d in CLIENT.get_list_database()]:
        CLIENT.create_database(database)
    # Write data to DB
    try:
        CLIENT.write_points(datapoints, database=database, time_precision='s')
    except Exception as e:
        #with open("keys.txt","a") as f:
        #    f.write("\n")
        #    f.write('Error during writing process')
        #    f.write(str(e))
        print('\nError during writing process')
        print(str(e))
        raise

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
    ## Load all existing coordinates
    #try:
    #    with open('coordinates.json', 'r') as f:
    #        coordinates = json.loads(f.read())
    #except:
    #    coordinates = {}

    available_databases = [d['name'] for d in list(CLIENT.get_list_database()) if d['name'] not in DB_status_exceptions]
    status['grids'] = {}
    t0 = time.time()
    status['toal_time_for_db_querys'] = 0
    status['total_time_for_json_loads'] = 0
    number_of_json_loads = 0
    number_of_db_querys = 0
    for db in available_databases:
        t1 = time.time()
        thisfilename = os.path.join(status_directory,f'{db}.json')
        if os.path.isfile(thisfilename):
            with open(thisfilename,'r') as file:
                last_db_status = json.load(file)
                status['grids'][db] = last_db_status
            if db in coordinates.keys():
                status['grids'][db]['coordinates'] = coordinates[db]
            else:
                status['grids'][db]['coordinates'] = {'lat':None,'lng':None}
            loadingtime = time.time() - t1
            status[f'time_for_loading_jsonfile_for_{db}'] = loadingtime
            status['total_time_for_json_loads'] += loadingtime
            number_of_json_loads += 1
        else:
            t11 = time.time()
            CLIENT.switch_database(db)
            #status[f'time_for_switching_for_{db}'] = time.time() - t1
            t2 = time.time()
            status['grids'][db] = {}
            if db in coordinates.keys():
                status['grids'][db]['coordinates'] = coordinates[db]
            else:
                status['grids'][db]['coordinates'] = {'lat':None,'lng':None}
            status['grids'][db]['measurements'] = {}
            #status[f'time_for_coordinates_{db}'] = time.time() - t2
            for location in [d['name'] for d in CLIENT.get_list_measurements()]:
                try:
                    t3 = time.time()
                    fields = [x["fieldKey"] for x in CLIENT.query('''show field keys on "{}" from "{}"'''.format(db,location)).get_points() if x["fieldType"] in ["float","integer"]][:]
                    result = CLIENT.query('SELECT LAST(U1), * from "'+location+'"', epoch='ms')
                    t4 = time.time()
                    #status['get_last_values_for_' + location] = t4 - t3
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
            loadingtime = time.time() - t11        
            status['toal_time_for_db_querys'] += loadingtime
            number_of_db_querys+= 1
        status[f'total_time_for_{db}'] = time.time() - t1
    status['total_time_databases'] = time.time() - t0
    status['average_time_for_db_querys'] = status['toal_time_for_db_querys'] / number_of_db_querys
    status['average_time_for_json_loads'] = status['total_time_for_json_loads'] / number_of_json_loads
    return jsonify({'status':status})

@app.route('/api/state', methods=['GET'])
def get_state():
    status = {}
    available_databases = ['StateEstimation']
    status['times']={}
    status['grids'] = {}
    t0=time.time()
    for db in available_databases:
        if db == 'StateEstimation':
            status['grids'][db] = {}
            thisfilename = os.path.join(status_directory,'state_sonderbuch.json')
            if os.path.isfile(thisfilename):
                with open(thisfilename,'r') as file:
                    state = json.load(file)
                status['grids'][db]['measurements'] = state
                status['times']['loading_state_file']=time.time()-t0
            
        else:
            CLIENT.switch_database(db)
            status['grids'][db] = {}
            status['grids'][db]['measurements'] = {}
            for location in [d['name'] for d in CLIENT.get_list_measurements()]:
                try:
                    t1 = time.time()
                    fields = [x["fieldKey"] for x in CLIENT.query('''show field keys on "{}" from "{}"'''.format(db,location)).get_points() if x["fieldType"] in ["float","integer"]][:]
                    result = CLIENT.query('SELECT LAST({}), * FROM "{}"'.format(fields[0],location), epoch='ms')           
                    result = list(result.get_points())[0]
                    result.pop('last')
                    status['grids'][db]['measurements'][location] = result
                except:
                    pass
                status['times'][f'query_mes_{location}']=time.time()-t1
            

    status['times']['whole_request']=time.time()-t0
    return jsonify({'status':status})
    #return json.dumps({'status':status},ensure_ascii=False)    

@app.route('/api/update', methods=['POST'])
def set_status():
    # Load all existing coordinates
    try:
        with open('coordinates.json', 'r') as f:
            coordinates = json.loads(f.read())
    except:
        coordinates = {}

    req = request.get_json()
    coordinates[req['db']] = {}
    coordinates[req['db']]['lat'] = req['lat']
    coordinates[req['db']]['lng'] = req['lng']

    with open('coordinates.json', 'w') as f:
        f.write(json.dumps(coordinates))

    return jsonify(coordinates)


if __name__ == '__main__':
    app.run(host='0.0.0.0')
