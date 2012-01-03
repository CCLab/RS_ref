#!/usr/bin/python2
import sys
import psycopg2
import psycopg2.extras
from time import time
from ConfigParser import ConfigParser

if len( sys.argv ) < 2:
    print '''
        python sql_tests.py <query>

        or

        python sql_tests.py <query> <collection_index>

        e.g.:

        python sql_tests.py region
        python sql_tests.py region 3

        WARNING: the collection_index starts with... 0
    '''
    sys.exit( 1 )

cfg = ConfigParser({ 'basedir': 'rawsdata.conf' })
cfg.read( 'rawsdata.conf' )

host   = cfg.get( 'postgres', 'host' )
dbname = cfg.get( 'postgres', 'dbname' )
user   = cfg.get( 'postgres', 'user' )
try:
    password = cfg.get( 'postgres', 'pass' )
except:
    password = None

conn_string = "host='%s' dbname='%s' user='%s' password='%s'" % ( host, dbname, user, password )

conn = psycopg2.connect( conn_string )
cursor = conn.cursor( cursor_factory=psycopg2.extras.RealDictCursor )

qry = sys.argv[1]
if len( qry ) < 3:
    sys.exit( 1 )

results = []

if len( sys.argv ) == 3:
    endpoint = int( sys.argv[2] )+1

    start = time()
    columns = '''SELECT key FROM columns
                 WHERE searchable IS TRUE
                   AND (endpoint IS NULL
                      OR endpoint = 'data_5000%d')
              ''' % endpoint

    cursor.execute( columns )
    keys = cursor.fetchall()

    keys = [ k['key'] for k in keys ]

    where = 'WHERE ('
    for i, col in enumerate( keys ):
        if i == 0:
            where += "%s ILIKE '%%%s%%'" % ( col, qry )
        else:
            where += " OR %s ILIKE '%%%s%%'" % ( col, qry )

    where += ')'

    query = "SELECT * FROM data_5000%d %s " % ( endpoint, where )
    cursor.execute( query )
    results = cursor.fetchall()

    end = time() - start
    print len( results )

else:
    start = time()
    # TODO make it with distinc endpoints count!!
    for endpoint in range( 1, 7 ):
        columns = '''SELECT key FROM columns
                     WHERE searchable IS TRUE
                       AND (endpoint IS NULL
                          OR endpoint = 'data_5000%d')
                  ''' % endpoint

        cursor.execute( columns )
        keys = cursor.fetchall()

        keys = [ k['key'] for k in keys ]

        where = 'WHERE ('
        for i, col in enumerate( keys ):
            if i == 0:
                where += "%s ILIKE '%%%s%%'" % ( col, qry )
            else:
                where += " OR %s ILIKE '%%%s%%'" % ( col, qry )

        where += ')'

        query = "SELECT COUNT(*) FROM data_5000%d %s " % ( endpoint, where )
        cursor.execute( query )
        results += cursor.fetchall()

    end = time() - start
    print results


print end
