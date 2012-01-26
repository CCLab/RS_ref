#!/usr/bin/python2
# -*- coding: utf-8 -*-
import os
import sys
import codecs
import simplejson as js
from types import *

# endpoint id
endpoint = 50000
# unique id
inx = 1000000000

# output files
hierarchy = codecs.open( 'hierarchy.sql', 'w', encoding='utf-8' )
#tables    = codecs.open( 'tables.sql', 'w', encoding='utf-8' )
inserts   = codecs.open( 'inserts.sql', 'w', encoding='utf-8' )

if len( sys.argv ) == 1:
    file_list = filter( lambda e: e.endswith('json'), sorted( os.listdir('.') ) )
else:
    file_list = [ sys.argv[1] ]

# load data
for f in file_list:
    endpoint += 1
    # final list of new rows
    results = []
    # new ids under old ids key
    visited = {}
    # all the paths under id keys
    paths   = {}

    data = js.loads( codecs.open( f, encoding='utf-8' ).read() )['data']

    for row in data:
        # increment the unique id
        inx += 1

        # cache the old idef
        old_idef  = row['idef']
        node_idef = row['parent']

        # if it's a top level - construct the top level path
        if node_idef == None:
            row['path'] = 'NULL'#'__root__.%d' % inx
        # else - read the parents path and add the node's idef to it
        else:
            row['path'] = '{0}'.format( paths[row['parent']] ) #'%s.%d' % ( paths[row['parent']], inx )

        # assign a new unique id
        row['id'] = inx
        # read a new, previously stored parent by the old parent's key
        row['parent'] = visited.get( row['parent'], None )

        # remove unwanted garbage from the object
        del row['parent_sort']
        del row['idef_sort']
        del row['idef']
        del row['level']


        # store the new idef under the old idefs keys
        visited[ old_idef ] = inx
        # store the node's path
        paths[ old_idef ] = row['id'] if row['path'] is 'NULL' else '{0},{1}'.format( row['path'], row['id'] )

        # save the brand new object
        results.append( row )

    # make a copy of keys and remove obligatory ones
    keys = sorted( results[0].keys() )
    keys.remove('path')

    # create tables
#    create = "CREATE TABLE data_%d ( %s );\n" % ( endpoint, '\t,\n'.join( keys ) )
#    tables.write( create )

    # create inserts
    for row in results:
        columns = ','.join( keys )
        insert  = 'INSERT INTO data_%d(%s) VALUES(' % ( endpoint, columns )

        for k in keys:
            try:
                value  = row[ k ]
            except KeyError as key_err:
                value = None

            v_type = type( value )

            if v_type in [ StringType, UnicodeType, IntType, FloatType ]:
                insert += "'%s'," % value.replace("'", '"')
            elif v_type is BooleanType:
                insert += '%s,' % str( value ).upper()
            elif v_type is NoneType:
                insert += 'NULL,'
            elif v_type is ListType:
                insert += "'%s'," % js.dumps( value )
            else:
                print type(value)

        insert = insert.rstrip(',')
        insert += ');\n'

        inserts.write( insert )

#        h_insert = "INSERT INTO hierarchy VALUES( %d, '%s' );\n" % ( row['id'], row['path'] )
#        hierarchy.write( h_insert )
        path = row['path'] if row['path'] is 'NULL' else "'{{{0}}}'".format( row['path'] )
#        print( 'INSERT INTO p_tree( id, parents ) VALUES( {0}, {1} );'.format( row['id'], path ))
        hierarchy.write( 'INSERT INTO p_tree( id, parents ) VALUES( {0}, {1} );\n'.format( row['id'], path ) )

hierarchy.close()
#tables.close()
inserts.close()




