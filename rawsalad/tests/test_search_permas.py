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
    {
        "endpoint" : 100002,
        "name"     : "Moje szukanie",
        "query"    : "szkol"
        "columns" : [ "type", "name", "v_total" ]
        "boxes" : [
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
                "name" : "Arkusz 1",
            }
        ]
    }
    '''
# test: permalink saving and restoring
permalink = js.loads( frontend_state )

