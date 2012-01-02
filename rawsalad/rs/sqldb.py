# -*- coding: utf-8 -*-
import os
import psycopg2 as psql
import psycopg2.extras as psqlextras

from ConfigParser import ConfigParser
from time import time


class DBConnection:
    def __init__( self ):
        '''Define a connection object for a selected database'''
        # TODO move config file path into SETTINGS
        dir_path  = os.path.dirname( __file__ )
        conf_file = os.path.join( dir_path, 'rawsdata.conf' )

        cfg = ConfigParser({ 'basedir': conf_file })
        cfg.read( conf_file )

        self.host   = cfg.get( 'postgres', 'host' )
        self.dbname = cfg.get( 'postgres', 'dbname' )
        self.user   = cfg.get( 'postgres', 'user' )
        try:
            self.password = cfg.get( 'postgres', 'pass' )
        except:
            self.password = None


    def connect( self ):
        '''Connect to db and return a connection singleton'''
        # if connection not established yet - connect
        try:
            return self.cursor
        except:
            config = "host='"+ self.host +"' dbname='"+ self.dbname +"' user='"+ self.user +"'"
            if self.password:
                config += " password='"+ self.password +"'"

            connection  = psql.connect( config )
            self.cursor = connection.cursor( cursor_factory=psqlextras.RealDictCursor )

            return self.cursor


class DBNavigator:
    '''Navigator tree'''
    def __init__( self ):
        self.cursor = DBConnection().connect()


    def get_db_tree( self ):
        '''Get the navigation tree for all database collections'''
        query = "SELECT * FROM dbtree ORDER BY id"
        self.cursor.execute( query )

        db_tree = self.cursor.fetchall()

        return db_tree


class Collection:
    '''Class for extracting data from acenrtain endpoint in the db'''
    # TODO move db connection to the session
    def __init__( self, endpoint, cursor=None ):
        # connect to db
        self.cursor = cursor or DBConnection().connect()
        # define the endpoint
        self.endpoint = endpoint
        # get the complete list of columns
        query = "SELECT * FROM columns WHERE endpoint IS NULL OR endpoint LIKE '%s'" % ( self.endpoint, )
        self.cursor.execute( query )
        self.columns = self.cursor.fetchall()


    def get_columns( self ):
        '''Get the columns of the collection'''
        return self.columns


    def get_top_level( self, fields=None ):
        '''Get the top level of the collection'''
        query = "SELECT * FROM %s WHERE parent IS NULL" % ( self.endpoint, )
        return self.get_data( query, fields )


    def get_node( self, _id, fields=None ):
        '''Get the certain node in the collection'''
        query = "SELECT * FROM %s WHERE id = %s" % ( self.endpoint, _id )
        data = self.get_data( query, fields )

        return data[0]


    def get_parent( self, _id, fields=None ):
        '''Get parent of the certain node in the collection'''
        node   = self.get_node( _id, fields )
        parent = self.get_node( node['parent'], fields )

        return parent


    def get_children( self, _id, fields=None ):
        '''Get children of the specified node'''
        query = "SELECT * FROM %s WHERE parent = %s" % ( self.endpoint, _id )
        return self.get_data( query, fields )


    def get_data( self, query={}, fields=None ):
        '''Get queried data from db'''

        self.cursor.execute( query )
        data = self.cursor.fetchall()

        return data

