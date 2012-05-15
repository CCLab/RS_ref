# -*- coding: utf-8 -*-

import rs.sqldb as sqldb

def collection_data_validated( data, files ):
    db_tree = sqldb.get_db_tree()
    parent_id = int( data.get( 'all_colls', 1 ) )
    siblings = filter( lambda e: e['parent'] == parent_id, db_tree )

    if data.get( 'type', '' ) == 'old':
        name = data.get( 'name', '' )
        return name.encode('utf-8') not in [ sib['name'] for sib in siblings ]
    elif data.get( 'type', '' ) == 'new':
        name = data.get( 'ancestor-name-0', '' )
        return name.encode('utf-8') not in [ sib['name'] for sib in siblings ]
    else:
        return False

