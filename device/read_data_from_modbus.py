import time
import json
import pprint
import math
import modbus_tk.defines as cst
import modbus_tk.modbus_tcp as modbus_tcp


modbus_data_info = [
        {'startadress': 800, 'names': ['f']},
        {'startadress': 808, 'names': ['U1','U2','U3']},
        {'startadress': 828, 'names': ['PF1','PF2','PF3']},
        {'startadress': 836, 'names': ['THDU1','THDU2','THDU3']},
        {'startadress': 860, 'names': ['I1','I2','I3']},
        {'startadress': 868, 'names': ['P1','P2','P3']},
        {'startadress': 876, 'names': ['Q1','Q2','Q3']},
        {'startadress': 884, 'names': ['S1','S2','S3']},
        {'startadress': 914, 'names': ['TDDI1','TDDI2','TDDI3']},
        {'startadress': 1002, 'names': ['HU1_'+str(i) for i in range(1,41)]},
        {'startadress': 1082, 'names': ['HU2_'+str(i) for i in range(1,41)]},
        {'startadress': 1162, 'names': ['HU3_'+str(i) for i in range(1,41)]},
        {'startadress': 1480, 'names': ['HI1_'+str(i) for i in range(1,41)]},
        {'startadress': 1560, 'names': ['HI2_'+str(i) for i in range(1,41)]},
        {'startadress': 1640, 'names': ['HI3_'+str(i) for i in range(1,41)]},
]


def get_modbus_point(master, startadress, numbytes, fmt):
    slave = 1  # I dont know what this does
    func_code = cst.READ_HOLDING_REGISTERS
    return master.execute(slave, func_code, startadress, numbytes, data_format=fmt)


def get_modbus_data(master, modbus_data_info):
    datapoint = {}

    for info in modbus_data_info:
        numfloats = len(info['names'])
        result = get_modbus_point(master, info['startadress'], numfloats*2, '>'+'f'*numfloats)
        for name, value in zip(info['names'], result):
            datapoint[name] = round(value,3)
            if math.isnan(value):
                datapoint[name] = 0

    return datapoint


if __name__ == '__main__':

    ip = '192.168.0.192'
    master = modbus_tcp.TcpMaster(host=ip)

    while True:
        loopstart = time.time()
        datapoint = get_modbus_data(master, modbus_data_info)
        timestamp = int(time.time())
        datadict = {
            'measurement': 'SB',
            'time': timestamp,
            'fields': datapoint,
            'tags': {
                'Address': 'Goldene Gasse 1'
            }
        }
        with open('data/'+str(timestamp)+'.json','w') as f:
            f.write(json.dumps(datadict))

        print('Time: ', round(time.time()-loopstart,3), end=', \t')
        print('Size: ', len(json.dumps(datadict)))

        time.sleep(max(0,1-(time.time()-loopstart)))
