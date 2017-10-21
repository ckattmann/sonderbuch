import glob
import json
import os
import time

import requests

print('Starting Passing json files to server')

while True:
    time.sleep(1)
    datapoints = []
    for f in glob.iglob('*.json'):
        with open(f, 'r') as fo:
            data = json.load(fo)
            datapoints.append(data)
        print('Passing ', datapoints)
        try:
            r = requests.post('http://localhost:5000/api/write', json=datapoints)
            os.remove(f)
        except:
            print('No connection to endpoint')
