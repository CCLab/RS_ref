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
    query = "SELECT * FROM dbtree ORDER BY id"
    # connect to db
    cursor = db_cursor()
    cursor.execute( query )

    return cursor.fetchall()


def search_count( user_query, endpoints ):
    from django.conf import settings
    # >> DEBUG MODE
    if settings.DEBUG:
        from time import time
        import re
        assert len( user_query ) >= 3, 'User query too short: "%s"' % user_query
        for endpoint in endpoints:
            assert re.match( '^data_\d{5}$', endpoint ), "Bad endpoint format: %s" % endpoint

        start = time()
    # >> EO DEBUG MODE

    # connect to db
    cursor = db_cursor()
    results = []

    # traverse through all requested endpoints
    for endpoint in endpoints:
        # collect all searchable column's keys
        columns = '''SELECT key FROM columns
                     WHERE searchable IS TRUE
                       AND (endpoints IS NULL
                          OR '%s' = ANY(endpoints))
                  ''' % endpoint

        cursor.execute( columns )
        keys = [ column['key'] for column in cursor.fetchall() ]

        # prepare a query to search throu them
        where = 'WHERE ('
        for i, key in enumerate( keys ):
            if i == 0:
                where += "%s ILIKE '%%%s%%'" % ( key, user_query )
            else:
                where += " OR %s ILIKE '%%%s%%'" % ( key, user_query )

        where += ')'

        query = "SELECT COUNT(*) FROM %s %s " % ( endpoint, where )
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
        print "   endpoints: %s" % str( endpoints )
        print ">> Time: %f" % end
        print ">> ------ DEBUG ---------"
    # >> EO DEBUG MODE

    return results


def search_data( user_query, endpoint ):
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
        where = "WHERE %s ILIKE '%%%s%%'" % ( key, user_query )
        query = "SELECT * FROM %s %s" % ( endpoint, where )

        cursor.execute( query )
        results = cursor.fetchall()

        # get only unique results from current column
        unique_data = [ r for r in results if not boxes.get( r['id'], None ) ]
        # transform db data into resource objects
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
            final_data['data'] += collection.get_unique_parents( result['parent'], visited_parents )

    # make boxes a list
    final_data['boxes'] = [ { 'id': k, 'hits': v } for k, v in  boxes.iteritems() ]


    # >> DEBUG MODE
    if settings.DEBUG:
        end = time() - start
        print ">> ------ DEBUG ---------"
        print ">> Search data time for:"
        print "   query: %s" % user_query
        print "   endpoint: %s" % endpoint
        print ">> Time: %f" % end
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
        query = "SELECT * FROM columns WHERE endpoints IS NULL OR '%s' = ANY( endpoints )" % ( self.endpoint, )
        self.cursor.execute( query )
        self.columns = self.cursor.fetchall()

        # get label of the endpoint
        query = "SELECT label FROM dbtree WHERE endpoint = '%s'" % ( self.endpoint, )
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
        query = "SELECT * FROM %s WHERE parent IS NULL" % ( self.endpoint, )
        return self.get_data( query )


    def get_node( self, _id ):
        '''Get the certain node in the collection'''
        query = "SELECT * FROM %s WHERE id = %s" % ( self.endpoint, _id )
        data = self.get_data( query )

        return data[0]


    def get_parent( self, _id ):
        '''Get parent of the certain node in the collection'''
        node   = self.get_node( _id )
        parent = self.get_node( node['parent'] )

        return parent


    def get_children( self, _id ):
        '''Get children of the specified node'''
        query = "SELECT * FROM %s WHERE parent = %s" % ( self.endpoint, _id )
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


    def get_unique_parents( self, parent_id, visited ):
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

            return [node] + self.get_unique_parents( node['parent'], visited )





