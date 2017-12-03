import time
import json
import pprint
import modbus_tk.modbus_tcp as modbus_tcp
import modbus_tk.defines as cst

# import read_data_from_modbus

ip = '192.168.0.192'
master = modbus_tcp.TcpMaster(host=ip)

with open('configuration.json','r') as f:
    CONF = json.load(f)


def get_modbus_point(master, startadress, numbytes, fmt):
    slave = 1  # I dont know what this does
    func_code = cst.READ_HOLDING_REGISTERS
    return master.execute(slave, func_code, startadress, numbytes, data_format=fmt)


def get_datadict(measurement_conf):

    # Get all values except harmonics
    # ===============================

    starttime = time.time()

    startaddress = 800
    num_values = 60
    values = get_modbus_point(master, startaddress, num_values*2, '>'+'f'*num_values)

    values_to_record = measurement_conf['values']
    with open('modbus_names.txt','r') as f:
        names = f.read().split('\n')
    full_datadict = {name: value for name,value in zip(names, values)}
    datadict = {k:round(v,3) for k,v in full_datadict.items() if k in values_to_record}

    # Get Harmonics
    # =============

    harmonics_modbus_data = {
            'U1': {'startaddress': 1000, 'inpercent': True, 'roundto': 2},
            'U2': {'startaddress': 1080, 'inpercent': True, 'roundto': 2},
            'U3': {'startaddress': 1160, 'inpercent': True, 'roundto': 2},
            'I1': {'startaddress': 1480, 'inpercent': False, 'roundto': 2},
            'I2': {'startaddress': 1560, 'inpercent': False, 'roundto': 2},
            'I3': {'startaddress': 1640, 'inpercent': False, 'roundto': 2}
    }

    for harmonics_name, harmonics_conf in harmonics_modbus_data.items():

        startaddress = 1000
        num_values = 40
        values = get_modbus_point(master, harmonics_conf['startaddress'], num_values*2, '>'+'f'*num_values)

        if harmonics_conf['inpercent']:
            if values[0] > 1:
                harmonics = [100 * values[i] / values[0] for i in range(1,len(values))]
            else:  # no voltage
                harmonics = [0 for i in range(1,len(values))]
        else:
            harmonics = [values[i] for i in range(1,len(values))]

        harmonics_to_record = measurement_conf['harmonics'][harmonics_name]
        harmonics_names = ['H'+harmonics_name+'_'+str(i) for i in range(2,len(values))]
        harmonics_dict = {name: round(value,harmonics_conf['roundto']) for i,(name, value) in enumerate(zip(harmonics_names, harmonics),2) if i in harmonics_to_record}

        datadict.update(harmonics_dict)

    return datadict



if __name__ == '__main__':

    while True:
        loopstart = time.time()
        datapoint = {}
        timestamp = int(time.time())
        for measurement_conf in CONF['measurements']:
            datadict = get_datadict(measurement_conf)
            if measurement_conf['id'] >= 1:
                datadict = {k+'@'+str(measurement_conf['id']):v for k,v in datadict.items()}
            datapoint.update(datadict)
        postdict = {
            'grid' : CONF['grid'],
            'location_id': CONF['location_id'],
            'time': timestamp,
            'fields': datapoint,
        }

        with open('data/'+str(timestamp)+'.json','w') as f:
            f.write(json.dumps(postdict))

        print('Time: ', round(time.time()-loopstart,3), end=', \t')
        print('Size: ', len(json.dumps(postdict)))

        # timetaken = round(time.time()-loopstart,3)
        # with open('times.csv','a') as f:
        #     f.write(str(round(time.time()*1000))+','+str(timetaken)+'\n')

        time.sleep(max(0,1-(time.time()-loopstart)))
