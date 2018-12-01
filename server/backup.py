#! encoding: utf-8
import os
import json
import time
import datetime
import pytz 
import logging
import influxdb
import pandas as pd


def tuple2str(tup):
    newli= []
    for x in tup:
        if type(x) != str:
            newli.append(tuple2str(x))
        else:
            newli.append(x)
    return "_".join(newli)

# Load Database Credentials
with open('dbcredentials.json', 'r') as f:
    dbcredentials = json.loads(f.read())
    
# Load CSV-Backup Credentials
with open('backupcredentials.json', 'r') as f:
    backupcredentials = json.loads(f.read())
backuptimeaverages = backupcredentials["timeaverages"]

client = influxdb.InfluxDBClient(**dbcredentials)
dfclient = influxdb.DataFrameClient(**dbcredentials)


def backup(timeavrg=None):
    backupdir = backupcredentials["backupdir"]
    if timeavrg != None:
        backupdir+="/{}_resample".format(timeavrg)
    else:
        backupdir+="/no_resample"

    yesterday = datetime.datetime.today().replace(hour=0,minute=0,second=0,microsecond=0)-datetime.timedelta(days=1)
    year = yesterday.year
    month = yesterday.month
    day = yesterday.day
    today = yesterday + datetime.timedelta(days=1)
    start_utc = pytz.utc.localize(yesterday).timestamp()
    end_utc = pytz.utc.localize(today).timestamp()


    dbnames = [d['name'] for d in client.get_list_database() if d["name"] not in ["_internal"]]
    for db in dbnames:
        # Ordner für jede Datenbank anlegen
        dbdirectory=os.path.join(backupdir,db)
        if not os.path.exists(dbdirectory):
            os.makedirs(dbdirectory) 
            
        # DB wechseln und alle "Tabellennamen" ermitteln    
        client.switch_database(db)
        measurementnames = [m['name'] for m in client.get_list_measurements()]
        
        for mes in measurementnames:
            # Unterordner für jede Tabelle anlegen
            mesdirectory=os.path.join(dbdirectory,mes)
            if not os.path.exists(mesdirectory):
                os.makedirs(mesdirectory)
                
            # Unterordner für Jahre/Monate anlegen
            savedirectory=os.path.join(mesdirectory,"{}/{}".format(year,month))
            if not os.path.exists(savedirectory):
                os.makedirs(savedirectory)
            
            fields = [x["fieldKey"] for x in client.query("show field keys on {} from {}".format(db,mes)).get_points() if x["fieldType"] in ["float","integer"]][:]
            tags = '","'.join([x["tagKey"] for x in client.query("show tag keys").get_points()])    
            if timeavrg != None:
                fieldnames = ",".join(['mean("{}") as "{}"'.format(i,i) for i in fields])
                query = '''select {} from {} where time >= {}s and time < {}s group by *,time({})'''.format(fieldnames,mes,int(start_utc),int(end_utc),timeavrg)
            else:
                query = '''select * from {} where time >= {}s and time < {}s group by *'''.format(mes,int(start_utc),int(end_utc))
                  
            try:
                ret=dfclient.query(query,database=db)
                for x in ret:
                    df=pd.DataFrame(ret[x])
                    filepath = os.path.join(savedirectory,"{}-{}-{}--{}.csv".format(year,month,day,tuple2str(x)))
                    df.to_csv(filepath, sep=";", decimal=",")
            except Exception as e:
                print(query)
                print(str(e))

backup()
for avrg in backuptimeaverages:
    backup(avrg)

