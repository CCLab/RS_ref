# -*- coding: utf-8 -*-
import os
import psycopg2 as psql
import psycopg2.extras as psqlextras

from ConfigParser import ConfigParser
from time import time

import simplejson as json

from django.conf import settings

def db_cursor( cfile=None, readonly=True ):
    '''Define a connection object for a selected database'''
    if cfile is None:
        from django.conf import settings
        conf_file = settings.DBCONF
    else:
        conf_file = cfile

    cfg = ConfigParser()
    cfg.read( conf_file )

    host   = cfg.get( 'postgres', 'host' )
    dbname = cfg.get( 'postgres', 'dbname' )
    if readonly:
        user = 'readonly'
        password = 'readonly'
    else:
        user = cfg.get( 'postgres', 'user' )
        password = cfg.get( 'postgres', 'pass' )

    '''user   = 'readonly' if readonly else cfg.get( 'postgres', 'user' )
    try:
        password = cfg.get( 'postgres', 'pass' )
    except:
        password = None
    '''

    config = "host='"+ host +"' dbname='"+ dbname +"' user='"+ user +"'"
    if password:
        config += " password='"+ password +"'"

    connection  = psql.connect( config )
    cursor = connection.cursor( cursor_factory=psqlextras.RealDictCursor )

    return cursor


def get_db_tree( debug_mode=settings.DEBUG ):
    '''Get the navigation tree for all database collections'''
    if debug_mode:
        query = '''SELECT * FROM dbtree
                   ORDER BY id
                '''
    else:
        query = '''SELECT * FROM dbtree
                   WHERE visible = TRUE
                   ORDER BY id
                '''

    # connect to db
    cursor = db_cursor()
    cursor.execute( query )

    db_tree = cursor.fetchall()
    for node in db_tree:
        del node['visible']

    return db_tree


def search_count( user_query, scope ):
    from django.conf import settings
    # >> DEBUG MODE
    if settings.DEBUG:
        from time import time
        import re
        assert len( user_query ) >= 3, 'User query too short: "%s"' % user_query
        for endpoint in scope:
            assert re.match( '^data_\d{5}$', endpoint ), "Bad endpoint format: %s" % endpoint

        start = time()
    # >> EO DEBUG MODE

    # connect to db
    cursor = db_cursor()
    results = []

    # traverse through all requested endpoints
    for endpoint in scope:
        # collect all searchable column's keys
        columns = '''SELECT key FROM columns
                     WHERE searchable IS TRUE
                       AND (endpoints IS NULL
                          OR '%s' = ANY(endpoints))
                  ''' % endpoint

        cursor.execute( columns )
        keys = [ column['key'] for column in cursor.fetchall() ]

        # prepare a query to search throu them
        where = '('
        for i, key in enumerate( keys ):
            if i == 0:
                where += "%s ILIKE '%%%s%%'" % ( key, user_query )
            else:
                where += " OR %s ILIKE '%%%s%%'" % ( key, user_query )

        where += ')'

        # get count of results in current endpoint
        query = '''SELECT COUNT(*) FROM %s
                   WHERE %s
                ''' % ( endpoint, where )
        cursor.execute( query )
        # collect the results
        result = {
            'endpoint' : endpoint,
            'count'    : cursor.fetchone()['count']
        }

        results.append( result )

    # >> DEBUG MODE
    if settings.DEBUG:
        end = time() - start
        print ">> ------ DEBUG ---------"
        print ">> Search count time for:"
        print "   query: %s" % user_query
        print "   endpoints: %s" % str( scope )
        print ">> total_time: %f" % end
        print ">> ------ DEBUG ---------"
    # >> EO DEBUG MODE

    return results


def search_data( user_query, endpoint, get_meta=False ):
    from django.conf import settings
    # >> DEBUG MODE
    if settings.DEBUG:
        from time import time
        import re
        assert len( user_query ) >= 3, 'User query too short: "%s"' % user_query
        assert re.match( '^data_\d{5}$', endpoint ), "Bad endpoint format: %s" % endpoint

        start = time()
    # >> EO DEBUG MODE

    # connect to db
    cursor = db_cursor()
    collection = Collection( endpoint, cursor )

    final_data = {
        'endpoint' : endpoint,
        'query'    : user_query,
        'data'     : [],
        'boxes'    : []
    }

    boxes = {}

    # collect of searchable columns' keys
    columns = '''SELECT key FROM columns
                 WHERE searchable IS TRUE
                   AND (endpoints IS NULL
                      OR '%s' = ANY(endpoints))
              ''' % endpoint

    cursor.execute( columns )
    keys = [ column['key'] for column in cursor.fetchall() ]

    unique_hits = set()
    # do the search once per searchable key
    for key in keys:
        query = '''SELECT * FROM %s
                   WHERE %s ILIKE '%%%s%%'
                   ORDER BY id
                ''' % ( endpoint, key, user_query )

        cursor.execute( query )
        results = cursor.fetchall()
        # get only unique results from current column
        unique_data = [ r for r in results if not boxes.get( r['id'] ) ]
        # transform db data into resource objects
        final_data['data'] += collection.prepare_data( unique_data )

        # for each result mark a hit column and collect parents
        for result in results:
            # keep it under parents key, but for the top level
            # len( unique_hits ) used as a unique key for each top level node
            parent = result['parent'] if result['parent'] else len( unique_hits )
            hit_id = result['id']

            # collect the boxes
            boxes.setdefault( parent, { hit_id: [] } )
            boxes[ parent ][ hit_id ] = boxes[ parent ].get( hit_id, [] ) + [ key ]

            # collect all unique hits
            unique_hits.add( hit_id )

    # get rid of parents --> [{id/hit, id/hit}, {id/hit}]
    boxes = boxes.values()
    hit_ids  = str( list( unique_hits ) ).strip('[]')
    subquery = '''SELECT DISTINCT unnest(parents) FROM p_tree
                  WHERE id IN ({0})
               '''.format( hit_ids )

    query = '''SELECT * FROM {0}
               WHERE id IN ({1})
            '''.format( endpoint, subquery )

    cursor.execute( query )
    unique_parents = [ r for r in cursor.fetchall() if r['id'] not in unique_hits ]
    # transform db data into resource objects
    final_data['data'] += collection.prepare_data( unique_parents )

    # make boxes a list
    for box in boxes:
        box_list = sorted( [{'id':k,'hits':v} for k,v in box.iteritems()], key=lambda e: e['id'] )
        final_data['boxes'].append( box_list )

    # sort results
    final_data['boxes'].sort( key=(lambda e: e[0]['id']) )
    final_data['data'].sort( key=(lambda e: e['id']) )

    if get_meta:
        final_data['meta'] = {
            'label'   : collection.get_label(),
            'columns' : collection.get_columns()
        }

    # >> DEBUG MODE
    if settings.DEBUG:
        end = time() - start
        print ">> ------ DEBUG ---------"
        print ">> Search data time for:"
        print "   query: %s" % user_query
        print "   count: %s" % len( final_data['boxes'] )
        print "   endpoint: %s" % endpoint
        print ">> total_time: %f" % end
        print ">> ------ DEBUG ---------"
    # >> EO DEBUG MODE

    return final_data


def save_permalink( data ):
    cursor = db_cursor()
    query = '''SELECT value FROM counters
               WHERE key = 'permalinks'
            '''
    cursor.execute( query )
    permalink_id = cursor.fetchone()['value'] + 1

    for endpoint in data:
        # create a lable list and prepare it for pgSQL array format
        labels = json.dumps( [ s['label'] for s in endpoint['sheets'] ] ).strip('[]')
        # store sheet jsons as sent by _db
        data   = json.dumps( endpoint['sheets'] )

        insert = '''INSERT INTO permalinks( id, endpoint, labels, data )
                    VALUES( %s, '%s', '{%s}', '%s' ); COMMIT;
                 ''' % ( permalink_id, endpoint['endpoint'], labels, data )

        cursor.execute( insert )

    update = '''UPDATE counters SET value = %s
                WHERE key = 'permalinks'; COMMIT;
             ''' % permalink_id

    cursor.execute( update )

    return permalink_id


def get_permalink_endpoints( id ):
    '''Collect signatures for all endpoints/sheets in permalink'''
    cursor = db_cursor()
    query = '''SELECT endpoint, labels FROM permalinks
               WHERE id = %s
            ''' % id

    cursor.execute( query )
    data = [{'endpoint': e['endpoint'], 'labels': e['labels']} for e in cursor.fetchall()]

    return data


# TODO: remove ??
def restore_group_old( id, endpoint ):
    '''Collect all data and metadata for a given endpoint.'''
    # connect to db
    cursor = db_cursor()
    # get minimal JSON object stored in db
    group  = get_snapshot( id, endpoint )

    # collect ids of unique open nodes in the endpoint
    unique_parents = set()
    for sheet in group['sheets']:
        # get parents of sheet's deepest open nodes
        query = '''SELECT DISTINCT unnest(parents) FROM p_tree
                   WHERE id IN ( %s )
                ''' % str( sheet['data']['ids'] ).strip('[]')
        cursor.execute( query )
        # gather all open nodes in the sheet
        # TODO don't use the RealDictCursor here
        open_nodes = sheet['data']['ids'] + [ e['unnest'] for e in cursor.fetchall() ]
        # collect only endpoint unique nodes
        map( unique_parents.add, open_nodes )

    # now collect the data (full data, not only ids!)
    collection = Collection( endpoint, cursor )
    # top level is always present
    group['data'] = collection.get_top_level()
    # collect all children of all open nodes in the endpoint
    for parent in unique_parents:
        #group['data'] += collection.get_children( parent )
        group['data'] += collection.get_nonempty_children( parent )

    group['data'].sort( key=lambda e: e['id'] )

    # add metadata for the endpoint
    group['meta'] = {
        'label': collection.get_label(),
        'columns': collection.get_columns()
    }

    return group


def restore_group( id, endpoint ):
    '''Collect all data and metadata for a given endpoint.'''
    # connect to db
    cursor = db_cursor()
    # get minimal JSON object stored in db
    group  = get_snapshot( id, endpoint )

    # collect ids of unique open nodes in the endpoint
    unique_parents = set([ None ]) 
    unique_nodes   = set()
    for sheet in group['sheets']:
        if sheet['type'] in [0, 1]:
            if not sheet['data'].get('ids', None):
                continue
            parents = get_standard_sheet_data( sheet['data'], cursor )
            unique_parents = unique_parents | parents
        else:
            parents, nodes = get_searched_sheet_data( sheet['data'], cursor )
            unique_parents = unique_parents | parents
            unique_nodes = unique_nodes | nodes

    # now collect the data (full data, not only ids!)
    collection = Collection( endpoint, cursor )

    group['data'] = []
    if None in unique_parents:
        group['data'] = collection.get_top_level()
        unique_parents.discard( None )

    # collect all children of all open nodes in the endpoint
    for parent in unique_parents:
        #children = collection.get_children( parent )
        children = collection.get_nonempty_children( parent )
        children_ids = [ child['id'] for child in children ]
        map( unique_nodes.discard, children_ids )
        group['data'] += children

    # collect other needed nodes
    for node in unique_nodes:
        prepared_node = collection.get_nodes( [ node ] )[0]
        group['data'].append( prepared_node )

    group['data'].sort( key=lambda e: e['id'] )

    # add metadata for the endpoint
    group['meta'] = {
        'label': collection.get_label(),
        'columns': collection.get_columns()
    }

    return group


def get_standard_sheet_data( data, cursor ):
    # get parents of sheet's deepest open nodes
    unique_parents = set()
    query = '''SELECT DISTINCT unnest(parents) FROM p_tree
               WHERE id IN ( %s )
            ''' % str( data['ids'] ).strip('[]')
    cursor.execute( query )
    # gather all open nodes in the sheet
    # TODO don't use the RealDictCursor here
    open_nodes = data['ids'] + [ e['unnest'] for e in cursor.fetchall() ]
    # collect only endpoint unique nodes
    map( unique_parents.add, open_nodes )

    return unique_parents


def get_searched_sheet_data( data, cursor ):
    unique_parents = set()
    unique_nodes = set()
    for box in data['boxes']:
        query = '''SELECT unnest(parents) FROM p_tree
                   WHERE id = %d
                ''' % box['rows'][0]['id']
        cursor.execute( query )
        parents = [ e['unnest'] for e in cursor.fetchall() ]
        # remember ids of all ancestors
        map( unique_nodes.add, parents )
        if box['context']:
            # remember that all children of parent are needed
            if not parents:
                # remember that top level is needed
                unique_parents.add( None )
            else:
                unique_parents.add( parents[-1] )
        else:
            # remember which nodes are needed
            ids = [ row['id'] for row in box['rows'] ]
            map( unique_nodes.add, ids )

    return unique_parents, unique_nodes


def get_snapshot( id, endpoint ):
    '''Get the permalink's group snapshot from db'''
    cursor = db_cursor()
    query = '''SELECT data FROM permalinks
               WHERE id = %s AND endpoint = '%s'
            ''' % ( id, endpoint )

    cursor.execute( query )
    sheets = cursor.fetchone()['data']

    return {
        'endpoint': endpoint,
        'sheets': json.loads( sheets )
    }

def is_user_valid( login, pass_hash ):
    '''Check if there is a user with specified login and password hash'''
    cursor = db_cursor()
    query = '''SELECT login, hash FROM users
               WHERE login = '%s' AND hash = '%s'
            ''' % ( login, pass_hash )

    cursor.execute( query )

    return len( cursor.fetchall() ) == 1

def get_user_uploaded_collections( login ):
    '''Get collections and add information about which of them were
    uploaded by the user.'''
    db_tree = get_db_tree( True )
    cursor = db_cursor()
    query = '''SELECT collections FROM users
               WHERE login = '%s'
            ''' % ( login )
    cursor.execute( query )
    user_collections_ids = cursor.fetchone()
    is_admin = user_collections_ids['collections'] is None

    for el in db_tree:
        el['user_uploaded'] = is_admin or el['id'] in user_collections_ids['collections']
                    
    return db_tree
    


class Collection:
    '''Class for extracting data from acenrtain endpoint in the db'''
    # TODO move db cursor to the session
    def __init__( self, endpoint, cursor=None, cfile=None ):
        # connect to db
        self.cursor = cursor or db_cursor(cfile=cfile)

        # define the endpoint
        self.endpoint = endpoint

        # get the complete list of columns
        query = '''SELECT * FROM columns
                   WHERE endpoints IS NULL
                      OR '%s' = ANY( endpoints )
                ''' % ( self.endpoint, )
        self.cursor.execute( query )
        self.columns = self.cursor.fetchall()

        # get label of the endpoint
        query = '''SELECT label,name FROM dbtree
                   WHERE endpoint = '%s'
                ''' % ( self.endpoint, )
        self.cursor.execute( query )
        result = self.cursor.fetchone()
        self.label = result['label']
        self.name = result['name']

        # get list describing hierarchy
        query = '''SELECT * FROM hierarchy
                   WHERE endpoint = '%s'
                ''' % ( self.endpoint, )
        self.cursor.execute( query )
        hierarchy = self.cursor.fetchall()
        self.hierarchy = sorted( hierarchy, key=lambda e: e['nr'] )


    def get_columns( self ):
        '''Get only these columns that are used by GUI'''
        from copy import deepcopy
        columns = deepcopy( self.columns )

        for column in columns:
            del column['endpoints']
            del column['searchable']

        return columns


    def get_hierarchy( self ):
        '''Get fields describing hierarchy in that collection'''
        from copy import deepcopy
        hierarchy = deepcopy( self.hierarchy )

        for element in hierarchy:
            del element['endpoint']
            del element['nr']

        return hierarchy


    def get_label( self ):
        '''Get the label of the collection'''
        return self.label


    def get_name( self ):
        '''Get the name of the collection'''
        return self.name


    def get_top_level( self ):
        '''Get the top level of the collection'''
        query = '''SELECT * FROM %s
                   WHERE parent IS NULL
                   ORDER BY id
                ''' % ( self.endpoint, )
        return self.get_data( query )


    def get_nodes( self, ids ):
        '''Get the certain node in the collection'''
        query = '''SELECT * FROM %s
                   WHERE id IN ( %s )
                ''' % ( self.endpoint, str( ids ).strip('[]') )
        data = self.get_data( query )

        return data


    def get_parent( self, _id ):
        '''Get parent of the certain node in the collection'''
        node   = self.get_nodes( [ _id ] )[0]
        parent = self.get_nodes( [ node['parent'] ] )[0]

        return parent


    def get_children( self, _id ):
        '''Get children of the specified node'''
        query = '''SELECT * FROM %s
                   WHERE parent = %s
                   ORDER BY id
                ''' % ( self.endpoint, _id )
        return self.get_data( query )


    def get_nonempty_children( self, _id ):
        '''Get children of the specified node, for any empty child
           get also its children (repeated recursively).'''

        children = self.get_children( _id )
        nonempty_children = []
        for child in children:
            nonempty_children.append( child )
            if child['data']['type'] == 'Empty':
                nonempty_children += self.get_nonempty_children( child['id'] )

        return nonempty_children


    def get_data( self, query={} ):
        '''Get queried data from db'''
        self.cursor.execute( query )
        data = self.cursor.fetchall()

        return self.prepare_data( data )


    def prepare_data( self, data ):
        '''Transform raw db data into table resource'''
        result = []
        for row in data:
            new_row = {
                'id'     : row['id'],
                'parent' : row['parent'],
                'leaf'   : row['leaf'],
                'aux'    : {},
                'data'   : {}
            }
            # if info exists, add it to auxiliary
            try:
                new_row['aux']['info'] = row['info']
            except:
                pass

            # collect all visible columns into data field
            for column in self.columns:
                key = column['key']
                new_row['data'][ key ] = row[ key ]

            result.append( new_row )

        return result


    def get_unique_parents( self, id ):
        '''Traverse the tree from a certain parent up to the top level'''
        query = '''SELECT * FROM %s
                   WHERE id IN( SELECT unnest(parents)
                   FROM p_tree WHERE id IN ( %d ) );
                ''' % ( self.endpoint, id )
        parents = self.get_data( query )
        parents.reverse()

        return parents

    def get_all_ids( self ):
        '''Get ids of all nodes'''
        query = '''SELECT id FROM %s''' % ( self.endpoint, )
        self.cursor.execute( query )

        results = self.cursor.fetchall()
        return [ t['id'] for t in results ]

