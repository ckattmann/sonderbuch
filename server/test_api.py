import api

print('Tests for parse_timeInterval')
print('============================')

inputs_parse_timeInterval = ['last24h', 'last7d', 'today', 'thisweek']
for inputstring in inputs_parse_timeInterval:
    print(inputstring, end=': \t')
    print(api.parse_timeInterval(inputstring))
