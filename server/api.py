import json
import time
# import datetime
# import pprint

from flask import Flask, request, jsonify
import influxdb

app = Flask(__name__)


# Load Database Credentials
with open('dbcredentials.json', 'r') as f:
    credentials = json.loads(f.read())
CLIENT = influxdb.InfluxDBClient(**credentials)


def parse_timeInterval(timeInterval):
    shortcuts = {'last24h': 'time > now() - 24h',
                 'last7d': 'time > now() - 168h',
                 'today': 'time > now() - 24h',
                 'thisweek': 'time > now() - 168h'}
    if timeInterval in shortcuts:
        parsed_timeInterval = shortcuts[timeInterval]
    else:
        parsed_timeInterval = timeInterval
    return parsed_timeInterval


def build_query_string(query_dict):
    ''' Build an IndexQL query string from the given dictionary '''

    select_string = 'SELECT '
    if isinstance(query_dict['values'], list):
        selected_string = ','.join(['mean('+v+')' for v in query_dict['values']])
    elif isinstance(query_dict['values'], str):
        selected_string = query_dict['values']
    else:
        print('selected_string', repr(query_dict['values']))

    select_string += selected_string

    # from_string = 'FROM ' + query_dict['device']
    from_string = 'FROM ' + 'netzmonitor'

    # WHERE
    where_string = 'WHERE ' + parse_timeInterval(query_dict['timeInterval'])

    # GROUPBY
    groupby_string = 'GROUP BY time('+query_dict['avrgInterval']+')'

    query_string = ' '.join([select_string, from_string, where_string, groupby_string])

    return query_string


@app.route('/api/hello', methods=['GET'])
def hello():
    return 'Hello World'


@app.route('/api/write', methods=['POST'])
def write_to_db():
    data = request.get_json()

    # Write data to InfluxDB database
    CLIENT.write_points(data, time_precision='s')

    # Additionally write latest json to file for quick retrieval of status
    # address = data['tags']['address']
    # with open()

    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}


@app.route('/api/query', methods=['GET'])
def querydb():
    query_dict = request.args.to_dict()
    if isinstance(query_dict['values'], str):
        if ',' in query_dict['values']:
            query_dict['values'] = query_dict['values'].split(',')
        else:
            query_dict['values'] = [query_dict['values']]

    if 'avrgInterval' not in query_dict:
        query_dict['avrgInterval'] = '10m'

    query_string = build_query_string(query_dict)
    try:
        query_starttime = time.time()
        query_result = CLIENT.query(query_string, epoch='ms')  # ms plays nicely with Dygraphs
        print('Query Time', time.time() - query_starttime)
    except influxdb.exceptions.InfluxDBClientError:
        print('DB not found?')
        raise

    try:
        data = query_result.raw['series'][0]['values']
    except:
        print('Query result: ',query_result)
        print('Query result raw: ',query_result.raw)
        data = []

    labels = ['time']
    labels.extend(query_dict['values'])

    return jsonify({'data':data, 'labels':labels})


@app.route('/api/status', methods=['GET'])
def get_status():
    # req = request.args.to_dict()
    result = CLIENT.query('SELECT LAST(U1),U2,U3 from netzmonitor', epoch='ms')
    status = list(result.get_points())[0]

    with open('lastStatus.json','w') as f:
        f.write(json.dumps(status))

    return jsonify({'status':status})


if __name__ == '__main__':
    app.run(host='0.0.0.0')
