import time
import json
import numpy as np


def write_dataset(verbose=False):
    ''' Write one json-file with random data to test the database chain '''

    timestamp = int(time.time())

    datadict = {
        'measurement': 'netzmonitor',
        'time': timestamp,
        'fields': {
            'f': 49.9 + (np.random.random() * 0.2),
            'U1': 220 + (np.random.random() * 20),
            'U2': 220 + (np.random.random() * 20),
            'U3': 220 + (np.random.random() * 20),
            'THDU1': 2 + (np.random.random() * 2),
            'THDU2': 2 + (np.random.random() * 2),
            'THDU3': 2 + (np.random.random() * 2),
            'I1': 10 + (np.random.random() * 2),
            'I2': 10 + (np.random.random() * 2),
            'I3': 10 + (np.random.random() * 2),
            'THDI1': 2 + (np.random.random() * 2),
            'THDI2': 2 + (np.random.random() * 2),
            'THDI3': 2 + (np.random.random() * 2),
            'S1': 400 + (np.random.random() * 4000),
            'S2': 400 + (np.random.random() * 4000),
            'S3': 400 + (np.random.random() * 4000),
            'Q1': 400 + (np.random.random() * 4000),
            'Q2': 400 + (np.random.random() * 4000),
            'Q3': 400 + (np.random.random() * 4000)
        },
        'tags': {
            'address': 'Beckengasse 14',
            'type': 'Haushalt',
            'coordinates': '48.25422,9.48291',
            'grid': 'SONDZ-E-UST-002',
        }
    }

    with open('data/'+str(timestamp)+'.json', 'w') as f:
        f.write(json.dumps(datadict))

    if verbose:
        print('Written ', datadict)


if __name__ == '__main__':
    while True:
        time.sleep(1)
        write_dataset(verbose=True)
