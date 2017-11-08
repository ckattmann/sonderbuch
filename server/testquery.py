import pprint
import requests

import matplotlib.pyplot as plt
import pandas as pd


QUERYDICT = {
    'timeaggstring': '1s',
    'agg': None,
    'device': 'mp0'
}

if __name__ == '__main__':
    query_dict = {
        'values': ['u1','thd1'],
        'device': 'mp0'
    }

    result = requests.get('http://localhost:5000/query', json=query_dict)
    if result.status_code != 200:
        print(result.status_code)

    df = pd.DataFrame(result.json())

    df.plot(x='time', y='thd1')
    plt.show()
