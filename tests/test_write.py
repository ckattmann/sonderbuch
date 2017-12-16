import time
import json
import requests
import influxdb

# Load Database Credentials
with open('../server/dbcredentials.json', 'r') as f:
    credentials = json.loads(f.read())
CLIENT = influxdb.InfluxDBClient(**credentials)


def write_to_db(data,database):

    if database not in [d['name'] for d in list(CLIENT.get_list_database())]:
            CLIENT.create_database(database)

    # Write data to InfluxDB database
    CLIENT.write_points(data, database=database, time_precision='s')

    # Additionally write latest json to file for quick retrieval of status
    # address = data['tags']['address']
    # with open()

    return 0

available_databases = [d['name'] for d in list(CLIENT.get_list_database()) if d['name'] != '_internal']

for db in available_databases:
    print(db)
    CLIENT.switch_database(db)
    for d in list(CLIENT.get_list_measurements()):
        print(' -> ', d)
        first_time = CLIENT.query('SELECT FIRST(U1) from "'+str(d['name']+'"'), epoch='ms')
        last_time = CLIENT.query('SELECT LAST(U1) from "'+str(d['name']+'"'), epoch='ms')
        print(' -> First: ',list(first_time.get_points())[0]['time'])
        print(' -> Last: ',list(last_time.get_points())[0]['time'])

timestamp = int(time.time())
datapoint = {'U1':230.0, 'THDU1':2.3, 'I1':0.06}
postdict = {
    'grid': 'SONDZ-E-UST-001',
    'location_id': '0',
    'time': timestamp,
    'fields': datapoint,
}
postdict['measurement'] = postdict.pop('location_id')
database = postdict.pop('grid')
data = []
data.append(postdict)
write_to_db(data, database)
