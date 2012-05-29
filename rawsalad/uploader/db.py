from copy import deepcopy


class DB:
    '''Class used as an interface to db during data upload.'''
    def __init__( self, cursor=None, conf=None):
        # cursor or conf should not be empty
        self.cursor = cursor if cursor is not None else get_cursor( conf )

    def get_counter( self, key ):
        query = '''SELECT value FROM counters
                   WHERE key = '%s'
                ''' % key
        self.cursor.execute( query )
        return self.cursor.fetchone()['value']

    def update_counter( self, key, new_value ):
        query = '''UPDATE counters SET value = %s
                   WHERE key = '%s'; COMMIT;
                ''' % (new_value, key)

        self.cursor.execute( query )


    def get_max_endpoint( self ):
        return self.get_counter( 'endpoints' )

    def set_max_endpoint( self, value ):
        self.update_counter( 'endpoints', value )

    def get_max_dbtree_id( self ):
        return self.get_counter( 'dbtree' )

    def set_max_dbtree_id( self, value ):
        self.update_counter( 'dbtree', value )

    def get_max_data_id( self ):
        return self.get_counter( 'data' )

    def set_max_data_id( self, value ):
        self.update_counter( 'data', value )


    def gen_endpoint_id( self ):
        new_max = self.get_max_endpoint() + 1
        self.set_max_endpoint( new_max )
        return new_max

    def gen_dbtree_id( self ):
        new_max = self.get_max_dbtree_id() + 1
        self.set_max_dbtree_id( new_max )
        return new_max


    def generate_insert_query( self, table, names, value ):
        '''Create insert query to table for any number of values. Names are
            keys in value object, which has values to insert.'''
        keys = []
        values = []
        vcopy = deepcopy( value )

        for name in names:
            if name in vcopy and vcopy[ name ] is not None:
                keys.append( name )
                if not isinstance( vcopy[name], basestring ):
                    vcopy[name] = str( vcopy[name] )
                else:
                    vcopy[name] = '\'' + vcopy[name] + '\''
                values.append( vcopy[name] )

        keys_str = ', '.join( keys )
        values_str = ', '.join( values )
        query = '''INSERT INTO %s ( %s ) VALUES ( %s ); COMMIT;
                ''' % ( table, keys_str, values_str )

        return query

    def insert_tree_node( self, node ):
        query = self.generate_insert_query( 'dbtree', node.keys(), node )
        self.cursor.execute( query.encode('utf-8') )

    def remove_tree_node( self, id ):
        query = '''DELETE FROM dbtree
                   WHERE id = %d; COMMIT;
                ''' % id

        self.cursor.execute( query )

    def get_children( self, id ):
        if id is None:
            query = '''SELECT * FROM dbtree
                       WHERE parent is NULL'''
        else:
            query = '''SELECT * FROM dbtree
                       WHERE parent = %d''' % id

        self.cursor.execute( query )
        return self.cursor.fetchall()

    def get_child( self, parent_id, name ):
        if parent_id is None:
            query = '''SELECT * FROM dbtree
                       WHERE parent is NULL AND name = '%s'
                    ''' % name
        else:
            query = '''SELECT * FROM dbtree
                       WHERE parent = '%s' AND name = '%s'
                    ''' % ( parent_id, name )

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchone()

    def insert_hierarchy_column( self, column, endpoint, nr ):
        obj = deepcopy( column )
        obj['endpoint'] = endpoint
        obj['nr'] = nr

        query = self.generate_insert_query( 'hierarchy', obj.keys(), obj )
        self.cursor.execute( query.encode('utf-8') )

    def remove_hierarchy( self, endpoint ):
        query = '''DELETE FROM hierarchy
                   WHERE endpoint = '%s'; COMMIT;
                ''' % endpoint

        self.cursor.execute( query.encode('utf-8') )

    def remove_columns( self, endpoint ):
        query = '''SELECT endpoints,key,type FROM columns
                       WHERE '%s' = ANY( endpoints )
                    ''' % endpoint

        self.cursor.execute( query.encode('utf-8') )
        columns = self.cursor.fetchall()

        for col in columns:
            old_endpoints = col['endpoints']
            new_endpoints = [end for end in old_endpoints if end != endpoint ]
            self.update_column_endpoints( old_endpoints, new_endpoints, col['key'], col['type'] )

    def get_column( self, name, type ):
        query = '''SELECT * FROM columns
                   WHERE key = '%s' AND type = '%s'
                ''' % ( name, type )

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchone()

    def insert_column( self, column ):
        is_basic = column.get( 'basic', False )
        is_processable = column.get( 'processable', False )
        is_searchable = column.get( 'searchable', False )

        db_column = ( column['endpoints'][0], column['key'], column['label'],
                      column['format'], is_basic, column['type'],
                      is_processable, is_searchable )

        query = '''INSERT INTO columns (endpoints, key, label, format,
                                           basic, type, processable, searchable)
                   VALUES( '{%s}', '%s', '%s', '%s', %s, '%s', %s, %s ); COMMIT;
                ''' % db_column

        self.cursor.execute( query.encode('utf-8') )

    def update_column_endpoints( self, old_endpoints, new_endpoints, key, type ):
        '''Update or delete column that has endpoints = old_endpoints, key and type
            the same as passed in arguments. If new_endpoints is not empty, then it should
            become value for endpoints field, otherwise column should be deleted.'''
        old_endpoints_str = ', '.join( old_endpoints )

        if new_endpoints != []:
            new_endpoints_str = ', '.join( new_endpoints )
            query = '''UPDATE columns SET endpoints = '{%s}'
                       WHERE endpoints = '{%s}' AND key = '%s' AND type = '%s'; COMMIT;
                    ''' % ( new_endpoints_str, old_endpoints_str, key, type )
        else:
            query = '''DELETE FROM columns
                       WHERE endpoints = '{%s}' AND key = '%s' AND type = '%s'; COMMIT;
                    ''' % ( old_endpoints_str, key, type )

        self.cursor.execute( query.encode('utf-8') )

    def get_leaves( self, endpoint ):
        query = '''SELECT * FROM %s WHERE leaf = True''' % endpoint

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchall()

    def get_nodes( self, endpoint, parents ):
        if parents == []:
            return []

        parents_str = ','.join( [ str(p) for p in parents ] )
        query = '''SELECT * FROM %s
                   WHERE id IN (%s)
                ''' % ( endpoint, parents_str )

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchall()
        

    def update_node( self, endpoint, keys, value, where ):
        '''Update data node from endpoint. Update its keys using values,
            find node using where dict, which keys are fields to search
            and values are values of node.'''
        query = '''UPDATE %s SET ''' % endpoint
        for k in keys:
            query += '%s = (%s + %s), ' % ( k, k, value[k] )

        query = query[:-2] # remove last ", "

        query += ' WHERE '
        for k, where_value in where.iteritems():
            if isinstance( where_value, basestring ):
                query += '''%s = '%s' AND ''' % (k, where_value )
            else:
                query += '%s = %s AND ' % (k, where_value )

        query = query[:-4] # remove last " AND"
        query += '; COMMIT;'

        self.cursor.execute( query.encode('utf-8') )

    def update_dbtree_depth( self, id, min_depth, max_depth ):
        query = '''UPDATE dbtree SET min_depth = %s, max_depth = %s
                   WHERE id = %d''' % ( min_depth, max_depth, id )
        
        self.cursor.execute( query.encode('utf-8') )

    def remove_table( self, tablename ):
        query = '''DROP TABLE IF EXISTS %s;''' % tablename
        self.cursor.execute( query )

    def create_table( self, tablename, columns ):
        types_map = {
            'string': 'TEXT',
            'number': 'INT'
        }

        create_query = '''CREATE TABLE %s (
                id              INT UNIQUE NOT NULL
                ,parent          INT REFERENCES %s(id)
                ,type            TEXT
                ,name            TEXT
                ,leaf            BOOLEAN
                ''' % ( tablename, tablename )

        for col in columns:
            col_descr = ''',%s       %s
                        ''' % ( col[0], types_map[ col[1] ] )
            create_query += col_descr
        create_query += ');'
            
        self.cursor.execute( create_query.encode('utf-8') )
        self.grant_access( tablename )

    def grant_access( self, tablename ):
        grant_query = 'GRANT SELECT ON %s TO readonly;' % tablename
        self.cursor.execute( grant_query.encode('utf-8') )

    def insert_data( self, tablename, filename ):
        f = open( filename, 'rb' )
        self.cursor.copy_from( f, tablename, sep=';', null='\N' )

    def remove_data( self, tablename, min_id=None, max_id=None ):
        if min_id is None and max_id is None:
            query = '''DROP TABLE IF EXISTS %s;''' % tablename
        elif min_id is None:
            query = '''DELETE FROM %s
                       WHERE id <= %s''' % ( tablename, max_id )
        elif max_id is None:
            query = '''DELETE FROM %s
                       WHERE id >= %s''' % ( tablename, min_id )
        else:
            query = '''DELETE FROM %s
                       WHERE id >= %s AND id <= %s''' % ( tablename, min_id, max_id )

        self.cursor.execute( query.encode('utf-8') )

    def insert_ptree_list( self, id, parents ):
        parents_str = '{%s}' % parents if parents is not None else None
        obj = {
            'id': id,
            'parents': parents_str
        }

        query = self.generate_insert_query( 'p_tree', obj.keys(), obj )
        self.cursor.execute( query.encode('utf-8') )

    def remove_ptree_list( self, id ):
        query = '''DELETE FROM p_tree
                   WHERE id = %d
                ''' % id

        self.cursor.execute( query.encode('utf-8') )

    def get_higher_dbtree( self, id ):
        query = '''SELECT id FROM dbtree
                   WHERE id > %s
                ''' % id

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchall()

    def get_higher_hierarchy( self, endpoint ):
        query = '''SELECT endpoint FROM hierarchy
                   WHERE endpoint > '%s'
                ''' % endpoint

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchall()

    def get_higher_columns( self, endpoint ):
        query = '''SELECT DISTINCT endpoints FROM columns''';
        
        self.cursor.execute( query.encode('utf-8') )
        all_endpoints = self.cursor.fetchall()

        return [e for e in all_endpoints if e > endpoint]

    def get_higher_ptree( self, id ):
        query = '''SELECT id FROM p_tree
                   WHERE id > %s
                ''' % id

        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchall()

    def remove_higher_dbtree( self, id ):
        query = '''DELETE FROM dbtree
                   WHERE id > %s
                ''' % id

        self.cursor.execute( query.encode('utf-8') )

    def remove_higher_hierarchy( self, endpoint ):
        query = '''DELETE FROM hierarchy
                   WHERE endpoint > '%s'
                ''' % endpoint

        self.cursor.execute( query.encode('utf-8') )

    def remove_higher_ptree( self, id ):
        query = '''DELETE FROM p_tree
                   WHERE id > %s
                ''' % id

        self.cursor.execute( query.encode('utf-8') )

    def remove_higher_columns( self, endpoint ):
        higher = self.get_higher_columns( endpoint )
        
        for end in higher:
            self.remove_columns( endpoint )


    def get_higher_datatables( self, endpoint_id ):
        query = '''SELECT table_name FROM information_schema.tables
                   WHERE table_name ILIKE 'data_%' '''
        self.cursor.execute( query.encode('utf-8') )
        names = self.cursor.fetchall()
        
        filtered_names = []
        for name in names:
            splitted = name['table_name'].split('_')
            try:
                if len( splitted ) != 2 and int( splitted[1] ) > endpoint_id:
                    filtered_names.append( name['table_name'] )
            except:
                pass

        return filtered_names

    def drop_higher_datatables( self, endpoint_id ):
        names = self.get_higher_datatables( endpoint_id )
        for name in names:
            query = '''DROP TABLE %s''' % name
            self.cursor.execute( query.encode('utf-8') )


def get_cursor(conf):
    from ConfigParser import ConfigParser
    import psycopg2 as psql
    import psycopg2.extras as psqlextras

    cfg = ConfigParser()
    cfg.read( conf )

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

