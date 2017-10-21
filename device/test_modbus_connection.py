import time
import json
import struct
import modbus_tk.defines as cst
holdregs = cst.READ_HOLDING_REGISTERS
import modbus_tk.modbus_tcp as modbus_tcp


def getharmonics(master):
    return master.execute(1,holdregs,1002,20,data_format='>ffffffffff')


if __name__ == '__main__':

    ip = '192.168.1.101'
    master = modbus_tcp.TcpMaster(host=ip)

    while True:
        loopstart = time.time()
        harmonics = getharmonics(master)
        with open('harmonics_1.json','w') as f:
            f.write(json.dumps({'harmonics': harmonics}))
        time.sleep(max(0,1-(time.time()-loopstart)))
