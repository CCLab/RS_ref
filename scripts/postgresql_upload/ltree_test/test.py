#!/usr/bin/python2
import psycopg2 as ps
import psycopg2.extras as pse
import random
import time
import sys

cur = ps.connect("host='localhost' dbname='tree_test'").cursor( cursor_factory=pse.RealDictCursor )

query = "SELECT id FROM data_50006 WHERE name ILIKE '%{0}%'".format( sys.argv[1] )
cur.execute( query )

results = str( [ e['id'] for e in cur.fetchall() ] ).strip('[]')

query = '''SELECT id, type, name FROM data_50006 WHERE id IN ( SELECT p.id FROM hierarchy c JOIN hierarchy p ON c.path <@ p.path WHERE c.id IN ( %s ))''' % results

start = time.time()
cur.execute(query)
results = cur.fetchall()
end = time.time() - start

print len(results)
print end
