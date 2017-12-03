import time
import json
import requests
import influxdb

# Load Database Credentials
with open('../server/dbcredentials.json', 'r') as f:
    credentials = json.loads(f.read())
CLIENT = influxdb.InfluxDBClient(**credentials)


def write_to_db(data):

    # Write data to InfluxDB database
    CLIENT.write_points(data, time_precision='s')

    # Additionally write latest json to file for quick retrieval of status
    # address = data['tags']['address']
    # with open()

    return 0

timestamp = int(time.time())
datapoint = {'U1':230.0, 'THDU1':2.3, 'I1':0.06}
postdict = {
    'grid' : 'SONDZ-E-UST-002',
    'location_id': 'mp0',
    'time': timestamp,
    'fields': datapoint,
}
postdict['measurement'] = postdict.pop('location_id')
data = []
data.append(postdict)
write_to_db(data)