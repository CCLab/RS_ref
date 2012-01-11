# -*- coding: utf-8 -*-
import os
import psycopg2 as psql
import psycopg2.extras as psqlextras

from ConfigParser import ConfigParser
from time import time


def db_cursor():
    '''Define a connection object for a selected database'''
    from django.conf import settings
    conf_file = settings.DBCONF

    cfg = ConfigParser()
    cfg.read( conf_file )

    host   = cfg.get( 'postgres', 'host' )
    dbname = cfg.get( 'postgres', 'dbname' )
    user   = cfg.get( 'postgres', 'user' )
    try:
        password = cfg.get( 'postgres', 'pass' )
    except:
        password = None


    config = "host='"+ host +"' dbname='"+ dbname +"' user='"+ user +"'"
    if password:
        config += " password='"+ password +"'"

    connection  = psql.connect( config )
    cursor = connection.cursor( cursor_factory=psqlextras.RealDictCursor )

    return cursor


def get_db_tree():
    '''Get the navigation tree for all database collections'''
    from django.conf import settings
    if settings.DEBUG:
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
        # get endpoint's id in the dbtree
        query = '''SELECT id FROM dbtree
                   WHERE endpoint = '%s'
                ''' % endpoint
        cursor.execute( query )
        tree_id = cursor.fetchone()['id']

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
            'tree_id'  : tree_id,
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

    # do the search once per searchable key
    for key in keys:
        query = '''SELECT * FROM %s
                   WHERE %s ILIKE '%%%s%%'
                   ORDER BY id
                ''' % ( endpoint, key, user_query )

        cursor.execute( query )
        results = cursor.fetchall()

        # get only unique results from current column
        unique_data = [ r for r in results if not boxes.get( r['id'], None ) ]
        # transform db data into resource objects
        # TODO consider getting already collected ids from _store
        final_data['data'] += collection.prepare_data( unique_data )

        # prepare a list of already collected parents
        visited_parents = {}
        [ visited_parents.setdefault( k, True ) for k in boxes ]
        # for each result mark a hit column and collect parents
        for result in results:
            hit_id = result['id']

            # collect the hit columns
            boxes.setdefault( hit_id, [] )
            boxes[ hit_id ].append( key )

            # add uniq parents
            final_data['data'] += collection.get_unique_parents( result['parent'], visited_parents, 0 )

    # make boxes a list
    final_data['boxes'] = [ { 'id': k, 'hits': v } for k, v in  boxes.iteritems() ]
    # sort results
    final_data['boxes'].sort( key=(lambda e: e['id']) )
    final_data['data'].sort( key=(lambda e: e['id']) )

    if get_meta:
        final_data['meta'] = {
            'name'    : collection.get_label(),
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


class Collection:
    '''Class for extracting data from acenrtain endpoint in the db'''
    # TODO move db cursor to the session
    def __init__( self, endpoint, cursor=None ):
        # connect to db
        self.cursor = cursor or db_cursor()

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
        query = '''SELECT label FROM dbtree
                   WHERE endpoint = '%s'
                ''' % ( self.endpoint, )
        self.cursor.execute( query )
        self.label = self.cursor.fetchone()['label']


    def get_columns( self ):
        '''Get only these columns that are used by GUI'''
        from copy import deepcopy
        columns = deepcopy( self.columns )

        for column in columns:
            del column['endpoints']
            del column['searchable']

        return columns


    def get_label( self ):
        '''Get the label of the collection'''
        return self.label


    def get_top_level( self ):
        '''Get the top level of the collection'''
        query = '''SELECT * FROM %s
                   WHERE parent IS NULL
                   ORDER BY id
                ''' % ( self.endpoint, )
        return self.get_data( query )


    def get_node( self, _id ):
        '''Get the certain node in the collection'''
        query = '''SELECT * FROM %s
                   WHERE id = %s
                ''' % ( self.endpoint, _id )
        data = self.get_data( query )

        return data[0]


    def get_parent( self, _id ):
        '''Get parent of the certain node in the collection'''
        node   = self.get_node( _id )
        parent = self.get_node( node['parent'] )

        return parent


    def get_children( self, _id ):
        '''Get children of the specified node'''
        query = '''SELECT * FROM %s
                   WHERE parent = %s
                   ORDER BY id
                ''' % ( self.endpoint, _id )
        return self.get_data( query )


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


    def get_unique_parents( self, parent_id, visited, t ):
        '''Traverse the tree from a certain parent up to the top level'''
        # hit the top level
        if not parent_id:
            return []
        # already been there
        elif parent_id in visited:
            return []
        # get parent and go on
        else:
            visited[ parent_id ] = True
            node = self.get_node( parent_id )

            return [node] + self.get_unique_parents( node['parent'], visited, t )

