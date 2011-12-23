#!/usr/bin/python
# -*- coding: utf-8 -*-
import sys
import os
dir_path = os.path.dirname( __file__ )
sys.path.append( os.path.join( dir_path, '..' ) )
import rs.dbapi as dbapi
import simplejson as js

# test: exemplary state object as specified in the frontend-backend communication
frontend_state = '''
    [
        {
            "endpoint" : 100002,
            "sheets" : [
                {
                    "filtered" : true,
                    "rows" : [
                        10000926,
                        10000986,
                        10000999,
                        10001003,
                        10001008,
                        10001022
                    ],
                    "name" : "Arkusz 1",
                    "columns" : [ "type", "name", "v_total" ]
                },
                {
                    "rows" : [
                        10000999,
                        10001008,
                        10001022
                    ],
                    "name" : "Budżet księgowy",
                    "columns" : [
                        "type",
                        "name",
                        "program-operacyjny-nazwa",
                        "wartosc-ogolem",
                        "dofinansowanie",
                        "nazwa-beneficjenta"
                    ]
                }
            ]
        },
        {
            "endpoint" : 100005,
            "sheets" : [
                {
                    "rows" : [
                        10001126,
                        10001147,
                        10001155
                    ],
                    "name" : "Ośrodki NFZ - centrala i śląski",
                    "columns" : [ "type", "name", "centrala", "slaski" ]
                }
            ]
        }
    ]
    '''
# test: permalink saving and restoring
permalink = js.loads( frontend_state )

print '--------------------------------------'
print '>> Creating state manager'
state = dbapi.StateManager()
print '   << State manager created\n'

print '>> Saving permalink'
perm_id = state.save_state( permalink )
print '   << Permalink saved with id: %d\n' % perm_id

print '>> Restoring permalink'
data = state.get_state( perm_id )
print '   << Permalink restored:'


# print all rows
for group in data['state']:
    for sheet in group['sheets']:
        print '\t^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'
        rows = sheet['rows']
        rows.sort( key=lambda e: e['_id'] )
        for row in rows:
            print '\t',
            for k in sheet['columns']:
                print row[k['key']],
            print ''


print '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'


