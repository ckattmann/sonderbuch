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

# Load all existing cooorinates
try:
    with open('coordinates.json', 'r') as f:
        coordinates = json.loads(f.read())
except:
    cooorinates = {}

def parse_timeInterval(timeInterval, database, measurement):
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
        result = CLIENT.query('SELECT FIRST(U1) from "'+measurement+'"', epoch='ms')
        first_ts = list(result.get_points())[0]['time']
        result = CLIENT.query('SELECT LAST(U1) from "'+measurement+'"', epoch='ms')
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
        selected_string = ','.join(['mean('+v+')' for v in query_dict['values']])
    elif isinstance(query_dict['values'], str):
        selected_string = query_dict['values']
    else:
        print('selected_string', repr(query_dict['values']))

    select_string += selected_string
    # FROM
    from_string = 'FROM "' + query_dict['location_id'] + '"'  # Extra double quotes for location_ids that are numbers
    # WHERE
    where_string = 'WHERE ' + parse_timeInterval(query_dict['timeInterval'], query_dict['grid'], query_dict['location_id'])
    # GROUPBY
    groupby_string = 'GROUP BY time('+query_dict['avrgInterval']+')'

    query_string = ' '.join([select_string, from_string, where_string, groupby_string])

    return query_string


@app.route('/api/query', methods=['POST'])
def querydb():
    query_dict = request.get_json()

    # Preprocess the request
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
    req = request.get_json()
    database = req['grid']
    datapoints = req['datapoints']

    if database not in [d['name'] for d in CLIENT.get_list_database()]:
        logging.debug(str(database)+' not in DB, attempting to create it')
        CLIENT.create_database(database)
        logging.debug('Databases in DB: '+[d['name'] for d in CLIENT.get_list_database()])

    # Write data to DB
    try:
        CLIENT.write_points(datapoints, database=database, time_precision='s')
    except:
        print(datapoints)
        raise

    # Additionally write latest json to file for quick retrieval of status
    # address = data['tags']['address']
    # with open()

    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}


@app.route('/api/status', methods=['GET'])
def get_status():
    status = {}

    available_databases = [d['name'] for d in list(CLIENT.get_list_database()) if d['name'] != '_internal']
    status['grids'] = {}
    for db in available_databases:
        CLIENT.switch_database(db)
        status['grids'][db] = {}
        if db in cooorinates.keys():
            status['grids'][db]['coordinates'] = cooorinates[db]
        for location in [d['name'] for d in list(CLIENT.get_list_measurements())]:
            result = CLIENT.query('SELECT LAST(U1),U2,U3,THDU1,THDU2,THDU3,I1,I2,I3,P1,P2,P3 from "'+location+'"', epoch='ms')
            result = list(result.get_points())[0]
            result['U1'] = result.pop('last')
            status['grids'][db]['measurements'][location] = result

    return jsonify({'status':status})

@app.route('/api/update', methods=['POST'])
def set_status():
    req = request.get_json()
    return jsonify(req)


if __name__ == '__main__':
    app.run(host='0.0.0.0')
