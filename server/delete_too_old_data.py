
import influxdb
import os
import json

def delete_too_old_data():
    dbcreds = os.path.join(os.path.dirname(os.path.realpath(__file__)),'dbcredentials.json')
    with open(dbcreds, 'r') as f:
        credentials = json.load(f)
    CLIENT = influxdb.InfluxDBClient(**credentials)

    dbnames = list(CLIENT.get_list_database())
    for DB in dbnames:
        dbname = DB['name']
        if dbname != '_internal':
            thisquery = "DELETE WHERE time <'2010-01-01'"
            try:
                CLIENT.query(thisquery,database=dbname)
            except:
                pass


if __name__ == '__main__':
    delete_too_old_data()

