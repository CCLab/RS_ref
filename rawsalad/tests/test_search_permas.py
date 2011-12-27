#!/usr/bin/python
# -*- coding: utf-8 -*-
import sys
import os
dir_path = os.path.dirname( __file__ )
sys.path.append( os.path.join( dir_path, '..' ) )
import rs.dbapi as dbapi
import simplejson as js


def test():
    print get_data( js.loads( get_state() ) )


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




def get_state():
# test: exemplary state object as specified in the frontend-backend communication
    frontend_state = '''
        [
            {
                "endpoint" : 100002,
                "sheets": [
                    {
                        "name"    : "Moje szukanie",
                        "type"    : "search",
                        "query"   : "szkol",
                        "columns" : [ "type", "name", "v_total" ],
                        "boxes"   : [
                            {
                                "context"    : false,
                                "breadcrumb" : false,
                                "rows" : [
                                    { "_id": 10000926, "hit": "name" },
                                    { "_id": 10000986, "hit": "name" },
                                    { "_id": 10000999, "hit": "name" },
                                    { "_id": 10001003, "hit": "name" },
                                    { "_id": 10001008, "hit": "name" },
                                    { "_id": 10001022, "hit": "name" }
                                ],
                            }
                        ]
                    }
                ]
            }
        ]
        '''

    return frontend_state


if __name__ == '__main__':
    test()
