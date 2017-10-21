import json
import pprint

from flask import Flask, request, jsonify
from influxdb import InfluxDBClient

import queryfunctions

app = Flask(__name__)


# Load Database Credentials
with open('dbcredentials.json', 'r') as f:
    credentials = json.loads(f.read())
CLIENT = InfluxDBClient(**credentials)


def build_query_string(query_dict):
    ''' Build an IndexQL query string from the given dictionary '''

    select_string = 'SELECT '
    if isinstance(query_dict['values'], list):
        selected_string = ','.join(['mean('+v+')' for v in query_dict['values']])
    elif isinstance(query_dict['values'], str):
        selected_string = query_dict['values']
    else:
        print('selected_string', repr(query_dict['values']))

    # selected_string = 'mean(' + ','.join(['mean('+v+')' for v in query_dict['values']]) + ')'
    select_string += selected_string

    # from_string = 'FROM ' + query_dict['device']
    from_string = 'FROM ' + 'SB'
    where_string = 'WHERE ' + 'time > now() - 48h'
    # groupby_string = 'GROUP BY time(' + query_dict['timeaggstring'] + ')'
    groupby_string = 'GROUP BY time(1m)'
    # groupby_string = ''

    query_string = ' '.join([select_string, from_string, where_string, groupby_string])

    return query_string


@app.route('/api/hello', methods=['GET'])
def hello():
    return 'Hello World'


@app.route('/api/write', methods=['POST'])
def write_to_db():
    data = request.get_json()
    CLIENT.write_points(data, time_precision='s')
    return 'OK'


@app.route('/api/query', methods=['GET'])
def querydb():
    query_dict = request.args.to_dict()
    if isinstance(query_dict['values'], str):
        if ',' in query_dict['values']:
            query_dict['values'] = query_dict['values'].split(',')
        else:
            query_dict['values'] = [query_dict['values']]

    query_string = build_query_string(query_dict)
    query_result = CLIENT.query(query_string, epoch='ms')
    data = query_result.raw['series'][0]['values']

    labels = ['time']
    labels.extend(query_dict['values'])

    print('Transmitting ',len(data), ' datapoints')

    return jsonify({'data':data, 'labels':labels})


if __name__ == '__main__':
    app.run(host='0.0.0.0')
