import glob
import json
import os
import time
import datetime

import requests


with open('configuration.json','r') as f:
    CONF = json.loads(f.read())
    SERVER_IP = CONF['api_ip']


def postdata(datapoints, files):
    try:
        r = requests.post('http://'+SERVER_IP+'/api/write', json=datapoints)
        if r.status_code == 200:
            [os.remove(f) for f in files]
            print('POSTed to '+ip+' until ', end=' ')
            print(datetime.datetime.fromtimestamp(datapoints[-1]['time']))
        else: 
            print('Server Response: ',r.text)
    except:
        print('No connection to endpoint')
        return False
    return True


while True:
    time.sleep(0.5)
    datapoints = []
    files = []

    for f in sorted(glob.iglob('data/*.json')):
        try:
            with open(f, 'r') as fo:
                data = json.load(fo)
            datapoints.append(data)
            files.append(f)
        except:
            pass  # Just try again next time

        # If data has accumulated, send in 180-second-snippets:
        if len(datapoints) >= 180:
            while not postdata(datapoints, files):
                time.sleep(1)
            datapoints = []
            files = []

    # normal sending:
    if datapoints:
        postdata(datapoints, files)
