# Server Installation Guide
## Install Anaconda
## Install InfluxDB
Installation link can be found at https://portal.influxdata.com/downloads

Installation for InfluxDB 1.3.7 is:
```
wget https://dl.influxdata.com/influxdb/releases/influxdb_1.3.7_amd64.deb
sudo dpkg -i influxdb_1.3.7_amd64.deb
```
``` bash
sudo service start influxd
```
If influxd doesnt start, maybe the permissions inside /var/lib/influxdb are wrong, to fix it execute 
```bash
sudo chown -R -c influxdb:influxdb *
```
Python bindings:
```bash
pip install influxdb
```

## Setup UWSGI
```bash
pip install uwsgi
```
uwsgi ini file
```ini   
[uwsgi]
module = api:app
socket = api.sock
chmod-socket = 777
buffer-size = 32768
; uid = www-data
; gid = www-data
processes = 2
; vacuum = true
master = true
``` 
Systemd ini file in */etc/systemd/system*
```ini
[Unit]
Description=uWSGI instance to serve Flask for Sonderbuch
After=network.target
[Service]
User=www-data
WorkingDirectory=/home/ckattmann/Sonderbuch/server
ExecStart=/home/ckattmann/anaconda3/bin/uwsgi --ini uwsgi.ini
[Install]
WantedBy=multi-user.target
 