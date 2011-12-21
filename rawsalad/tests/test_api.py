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
                    "rows" : [
                        10000926,
                        10000986,
                        10000999,
                        10001003,
                        10001008,
                        10001022
                    ],
                    "name" : "Arkusz 1",
                    "breadcrumbs" : [
                        "Bread 1",
                        "Bread 2",
                        "Bread 3",
                        "Bread 4",
                        "Bread 5",
                        "Bread 6"
                    ],
                    "filtered" : true,
                    "columns" : [
                        {
                            "format" : "@",
                            "label" : "Typ",
                            "processable" : false,
                            "key" : "type",
                            "basic" : true,
                            "type" : "string"
                        },
                        {
                            "format" : "@",
                            "label" : "Treść",
                            "processable" : true,
                            "key" : "name",
                            "basic" : true,
                            "type" : "string"
                        },
                        {
                            "format" : "# ##0",
                            "label" : "Ogółem (tys. zł.)",
                            "processable" : true,
                            "key" : "v_total",
                            "basic" : true,
                            "checkable" : true,
                            "type" : "number"
                        }
                    ]
                },
                {
                    "rows" : [
                        10000999,
                        10001008,
                        10001022
                    ],
                    "name" : "Budżet księgowy",
                    "columns" : [
                        {
                            "format" : "@",
                            "label" : "Typ",
                            "processable" : false,
                            "key" : "type",
                            "basic" : true,
                            "type" : "string"
                        },
                        {
                            "format" : "@",
                            "label" : "Nazwa",
                            "processable" : true,
                            "key" : "name",
                            "basic" : true,
                            "type" : "string"
                        },
                        {
                            "format" : "@",
                            "label" : "Program Operacyjny <Nazwa>",
                            "processable" : true,
                            "key" : "program-operacyjny-nazwa",
                            "basic" : true,
                            "type" : "string"
                        },
                        {
                            "format" : "# ##0.00",
                            "label" : "Wartość ogółem",
                            "processable" : true,
                            "key" : "wartosc-ogolem",
                            "basic" : true,
                            "checkable" : true,
                            "type" : "float"
                        },
                        {
                            "format" : "# ##0.00",
                            "label" : "Dofinansowanie",
                            "processable" : true,
                            "key" : "dofinansowanie",
                            "basic" : true,
                            "checkable" : true,
                            "type" : "float"
                        },
                        {
                            "format" : "@",
                            "label" : "Nazwa beneficjenta",
                            "processable" : true,
                            "key" : "nazwa-beneficjenta",
                            "basic" : true,
                            "type" : "string"
                        }
                    ]
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

for group in data['state']:
    for sheet in group['sheets']:
        print '\t^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'
        rows = sheet['rows']
        rows.sort( key=lambda e: e['_id'] )
        for row in rows:
            print '\t', row['_id'], row['type'], row['name']

print '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'


