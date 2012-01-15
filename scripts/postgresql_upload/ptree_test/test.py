#!/usr/bin/python2
import psycopg2 as ps
import psycopg2.extras as pse
import random
import time
import collections
import sys

def flatten( x ):
    if isinstance( x, collections.Iterable ):
        return { a for i in x for a in flatten( i ) }
    elif x == None:
        return {}
    else:
        return { x }


visited = {}
start = time.time()

d_cur = ps.connect("host='localhost' dbname='tree_test'").cursor( cursor_factory=pse.RealDictCursor )
t_cur = ps.connect("host='localhost' dbname='tree_test'").cursor()

query = "SELECT * FROM data_50006 WHERE name ILIKE '%{0}%'".format( sys.argv[1] )
d_cur.execute( query )

final_data = d_cur.fetchall()
for e in final_data:
    visited[e['id']] = True

hit = len( final_data )

ids = str( [ e['id'] for e in final_data ] ).strip('[]')
query = "SELECT DISTINCT parents FROM p_tree WHERE id IN ({0})".format( ids )

t_cur.execute(query)
results = list( flatten( t_cur.fetchall() ) )
results = str( [ e for e in results if not visited.get( e, False ) ] ).strip('[]')

query = '''SELECT * FROM data_50006 WHERE id IN ({0})'''.format( results )
d_cur.execute( query )
final_data += d_cur.fetchall()
final_data.sort( key=lambda e: e['id'] )

end = time.time() - start
#for d in final_data:
#    print '{0} :: {1:30s} // {2}'.format( d['id'], d['type'], d['name'] )

print '--------------------'
print '{0} :: {1}'.format( hit, len( final_data ) )
print end

