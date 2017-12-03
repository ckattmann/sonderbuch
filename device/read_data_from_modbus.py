import time
import json
import pprint
import math
import modbus_tk.defines as cst
import modbus_tk.modbus_tcp as modbus_tcp


data_info = [
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


modbus_data = {
    'f': {'startadress': 800, 'numberOfBytes': 2, 'data_format': '>f'},
    'U1': {'startadress': 808, 'numberOfBytes': 2, 'data_format': '>f'},
    'U2': {'startadress': 810, 'numberOfBytes': 2, 'data_format': '>f'},
    'U3': {'startadress': 812, 'numberOfBytes': 2, 'data_format': '>f'},
    'PF1': {'startadress': 828, 'numberOfBytes': 2, 'data_format': '>f'},
    'PF2': {'startadress': 830, 'numberOfBytes': 2, 'data_format': '>f'},
    'PF3': {'startadress': 832, 'numberOfBytes': 2, 'data_format': '>f'},
    'THDU1': {'startadress': 836, 'numberOfBytes': 2, 'data_format': '>f'},
    'THDU2': {'startadress': 838, 'numberOfBytes': 2, 'data_format': '>f'},
    'THDU3': {'startadress': 840, 'numberOfBytes': 2, 'data_format': '>f'},
    'I1': {'startadress': 860, 'numberOfBytes': 2, 'data_format': '>f'},
    'I2': {'startadress': 862, 'numberOfBytes': 2, 'data_format': '>f'},
    'I3': {'startadress': 864, 'numberOfBytes': 2, 'data_format': '>f'},
    'P1': {'startadress': 860, 'numberOfBytes': 2, 'data_format': '>f'},
    'P2': {'startadress': 862, 'numberOfBytes': 2, 'data_format': '>f'},
    'P3': {'startadress': 864, 'numberOfBytes': 2, 'data_format': '>f'},
    'TDDI1': {'startadress': 914, 'numberOfBytes': 2, 'data_format': '>f'},
    'TDDI2': {'startadress': 916, 'numberOfBytes': 2, 'data_format': '>f'},
    'TDDI3': {'startadress': 918, 'numberOfBytes': 2, 'data_format': '>f'},
}


def translate_datapoints(datapoints):
    modbus_data_list = [(k,v['startadress'],v['numberOfBytes'],v['data_format']) for k,v in modbus_data.items()]
    modbus_data_list.sort(key=lambda s: s[1])
    startadresses = [v['startadress'] for v in modbus_data.values()].sort()
    
    while modbus_data_list:
        datapoint = modbus_data_list.pop()
        if datapoint[1] + numbytes in startadresses:
            pass
    numberOfBytes_list = [v['numberOfBytes'] for v in modbus_data.values()]
    # print(startadresses)
    # modbus_code_translation[datapoint]
    modbus_info = []
    return modbus_info


def get_modbus_point(master, startadress, numbytes, fmt):
    slave = 1  # I dont know what this does
    func_code = cst.READ_HOLDING_REGISTERS
    return master.execute(slave, func_code, startadress, numbytes, data_format=fmt)


def get_modbus_data(master, data_info):
    datapoint = {}

    for info in data_info:
        numfloats = len(info['names'])
        result = get_modbus_point(master, info['startadress'], numfloats*2, '>'+'f'*numfloats)
        for name, value in zip(info['names'], result):
            datapoint[name] = round(value,3)
            if math.isnan(value):
                datapoint[name] = 0

    return datapoint


if __name__ == '__main__':

    # translate_datapoints(modbus_data)

    ip = '192.168.0.192'
    master = modbus_tcp.TcpMaster(host=ip)

    while True:
        loopstart = time.time()
        datapoint = get_modbus_data(master, data_info)
        timestamp = int(time.time())
        datadict = {
            'measurement': 'netzmonitor',
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

        # timetaken = round(time.time()-loopstart,3)
        # with open('times.csv','a') as f:
        #     f.write(str(round(time.time()*1000))+','+str(timetaken)+'\n')

        time.sleep(max(0,1-(time.time()-loopstart)))
