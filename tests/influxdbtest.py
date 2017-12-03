import influxdb

host = 'localhost'
port = '8086'
user = 'root'
password = 'root'
database = 'dbname'

c = influxdb.InfluxDBClient(host, port, user, password, database)


def query(querystring):
    result = c.query(querystring, epoch='ms')
    print(list(result.get_points())[0])
    # for r in result:
    #     print(r)


query('SHOW MEASUREMENTS')
# query('SELECT last(U1), THDU1 from SB')
print(dir(c))
print(c.get_list_measurements())
print(c.get_list_database.__doc__)

print(c.get_list_database())
