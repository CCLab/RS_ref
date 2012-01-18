#!/usr/bin/python
import psycopg2 as ps
import psycopg2.extras as pse
import random
import time
import sys

visited = {}
start = time.time()

d_cur = ps.connect("host='localhost' dbname='rs_ref'").cursor( cursor_factory=pse.RealDictCursor )
t_cur = ps.connect("host='localhost' dbname='rs_ref'").cursor()

query = "SELECT * FROM {1} WHERE name ILIKE '%{0}%'".format( sys.argv[1], sys.argv[2] )
d_cur.execute( query )

final_data = d_cur.fetchall()
for e in final_data:
    visited[e['id']] = True

hit = len( final_data )

ids = str( [ e['id'] for e in final_data ] ).strip('[]')
subquery = "SELECT DISTINCT unnest( parents) FROM p_tree WHERE id IN ({0})".format( ids )
query = '''SELECT * FROM {1} WHERE id IN ({0})'''.format( subquery, sys.argv[2] )
d_cur.execute( query )
final_data += d_cur.fetchall()
final_data.sort( key=lambda e: e['id'] )

end = time.time() - start

'''
for d in final_data:
    for k in d:
	print '{0};'.format(d[k]),
    print ''
'''

print '--------------------'
print '{0} :: {1}'.format( hit, len( final_data ) )
print end


