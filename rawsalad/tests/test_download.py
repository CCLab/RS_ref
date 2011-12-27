#!/usr/bin/python
# -*- coding: utf-8 -*-
import sys
import os
dir_path = os.path.dirname( __file__ )
sys.path.append( os.path.join( dir_path, '..' ) )
import rs.dbapi as dbapi
import simplejson as js

# test: exemplary state object as specified in the frontend-backend communication
def test():
    # test: permalink saving and restoring
    state = js.loads( get_state() )
    data  = get_data( state )

    # print all rows
    for s in data:
        for sheet in s['sheets']:
            data_to_table( sheet )
#        for sheet in s['sheets']:
#            print sheet['columns']
#        print '========================================'

#    for group in data:
#        for sheet in group['sheets']:
#            print '\t^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'
#            print sheet['columns']
#            rows = sheet['rows']
#            rows.sort( key=lambda e: e['_id'] )
#            for row in rows:
#                print row
#                print '\t',
#                for k in sheet['columns']:
#                    print row[k['key']],
#                print ''

    print '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'




def get_data( state ):
    '''Get data from db'''
    sm = dbapi.StateManager()

    for group in state:
        endpoint   = group['endpoint']
        collection = dbapi.Collection( endpoint, db=sm.db )

        # get data for each sheet in the group
        for sheet in group['sheets']:
            fields = [ 'parent' ] + sheet['columns'][:]
            # take sheet['columns'] keys and grab key&name from full columns data
            columns = []
            for key in sheet['columns']:
                for column in collection.get_columns():
                    if key == column['key']:
                        columns.append({
                            'key'   : column['key'],
                            'label' : column['label']
                        })
            sheet['columns'] = columns

            if sheet.get('type', None) == "filter":
                data = collection.get_data( query={ '_id': { '$in': sheet['rows'] }}, fields=fields )
                # mark them as filtering results
                for d in data:
                    d['filtered'] = True
                # add unique parents
                visited = {}
                for node in data:
                    data += sm.get_unique_parents( collection, node['parent'], visited, fields=fields )
            else:
                # top level is always present
                data = collection.get_data( query={'parent': None}, fields=fields )
                # add all open subtrees
                visited = {}
                for _id in sheet['rows']:
                    parent_id = collection.get_node( _id )['parent']
                    data += sm.collect_children( collection, parent_id, visited, fields=fields )

            sheet['rows'] = sorted( data, key=lambda e: e['_id'] )

    return state



def data_to_table( sheet ):
    # prepare easy and fast access to collected data
    cache = {}
    for row in sheet['rows']:
        cache[ row['_id'] ] = row

    table = [ create_row( cache, row ) for row in sheet['rows'] ]


def create_row( cache, row ):
    basic_row = [ row[k] for k in row ]
    table_row = get_parents( cache, row ) + basic_row

    print table_row

def get_parents( cache, row ):
    if not row['parent']:
        return [ row['name'] ]
    else:
        parent = cache[ row['parent'] ]
        return get_parents( cache, parent ) + [ row['name'] ]


def get_state():
    frontend_state = '''
        [
            {
                "endpoint" : 100002,
                "sheets" : [
                    {
                        "type" : "filter",
                        "name" : "Arkusz 1",
                        "rows" : [
                            10000926,
                            10000986,
                            10000999,
                            10001003,
                            10001008,
                            10001022
                        ],
                        "columns" : [ "type", "name", "numer", "pozycja", "v_total" ]
                    },
                    {
                        "name" : "Budżet księgowy",
                        "rows" : [
                            10000999,
                            10001008,
                            10001022
                        ],
                        "columns" : [ "type", "name", "v_total" ]
                    }
                ]
            },
            {
                "endpoint" : 100005,
                "sheets" : [
                    {
                        "name" : "Ośrodki NFZ - centrala i śląski",
                        "rows" : [
                            10001126,
                            10001133,
                            10001143,
                            10001144,
                            10001145,
                            10001146,
                            10001147,
                            10001155
                        ],
                        "columns" : [ "type", "name", "centrala", "slaski" ]
                    }
                ]
            }
        ]
        '''

    return frontend_state


if __name__ == '__main__':
    test()
