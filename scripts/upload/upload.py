# -*- coding: utf-8 -*-

'''
Modifications:
1) Change way of obtaining data to upload -> create new class extending BasicDataSrc
2) Change way of defining hierarchy -> create new class extending BasicHierarchy
3) Change way of uploading data -> create new class extending BasicUploader
'''

from urllib2 import urlopen
from collections import deque
from exceptions import StopIteration
from csv import reader as csvreader
from copy import deepcopy
import simplejson as json

class BasicReader:
    '''Reads data from a source.'''
    def __init__( self, src, std_size=10000, stop_sign='\n', enc='utf-8' ):
        self.src = src
        self.size = std_size
        self.buffer = deque()
        self.stop_sign = stop_sign
        self.enc = enc

    def __iter__( self ):
        return self

    def next( self ):
        row = []

        while self.stop_sign not in self.buffer:
            bulk = self.read_bulk()
            if bulk == '':
                raise StopIteration
            self.buffer += bulk
        
        left = ''
        while left != self.stop_sign:
            left = self.buffer.popleft()
            row.append( left )
        return (''.join( row ))
                
    def read_bulk( self, size=None ):
        read_size = size if size is not None else self.size
        bulk = self.src.read( read_size )
        self.buffer += bulk
        buffer_copy = ''.join( self.buffer )
        self.buffer.clear()
        return buffer_copy

    def read_all( self ):
        bulk = self.src.read()
        self.buffer += bulk
        buffer_copy = ''.join( self.buffer )
        self.buffer.clear()
        return buffer_copy.decode(self.enc)

    def is_all_read( self ):
        data_part = self.src.read(1)
        if data_part != '':
            self.buffer.append( data_part )
        return len( self.buffer ) == 0


class FileReader(BasicReader):
    '''Reads data from a file.'''
    def __init__( self, filename, std_size=10000, stop_sign='\n', enc='utf-8' ):
        self.src = open( filename, 'rb' )
        self.size = std_size
        self.buffer = deque()
        self.stop_sign = stop_sign
        self.enc = enc

    def __del__( self ):
        self.src.close()


class UrlReader(BasicReader):
    '''Reads data from a URL.'''
    def __init__( self, url, std_size=10000, stop_sign='\n', enc='utf-8' ):
        self.src = urlopen( url )
        self.size = std_size
        self.buffer = deque()
        self.stop_sign = stop_sign
        self.enc = enc

    def __del__( self ):
        self.src.close()


# TODO: can it be defined?
class APIReader(BasicReader):
    '''Reads data from API.'''
    def __init__( self, meta, data ):
        pass


class Meta:
    '''Reads meta data from a data source. Meta data contains collection name and description,
       hierarchy description, columns description. Data reader should be an instance of a subclass
       of BasicReader.'''
    def __init__( self, reader ):
        self.reader = reader
        content = reader.read_all()
        json_content = json.loads( content )
        self.node = {
            'name': json_content['name'],
            'description': json_content['description']
        }
        self.columns = json_content['columns']
        self.hierarchy = json_content['hierarchy']
        self.parents = json_content['parents']

    def get_node( self ):
        return self.node

    def get_name( self ):
        return self.node['name']

    def get_description( self ):
        return self.node['description']

    def get_columns( self ):
        return self.columns

    def get_column( self, i ):
        return self.get_columns()[ i ]

    def get_column_par( self, i, param ):
        return self.get_column( i )[ param ]

    def get_hierarchy( self ):
        return self.hierarchy

    def get_hierarchy_column( self, i ):    
        return self.get_hierarchy()[ i ]

    def get_hierarchy_column_par( self, i, param ):
        return self.get_hierarchy_column( i )[ param ]

    def get_parents( self ):
        return self.parents

    def get_parent( self, i ):
        return self.get_parents()[ i ]

    def get_parent_par( self, i, param ):
        return self.get_parent( i )[ param ]
        
    
class DataReceiver:
    '''Receives data from a data source and knows how to interpret it. Data reader
       is an instance of a subclass of BasicReader.'''
    def __init__( self, reader ):
        self.reader = reader 
        self.rows = deque()
        self.buffer = ''

    def read_rows( self ):
        self.buffer += self.reader.read_bulk()
        while not self.is_row_in_buffer() and not self.reader.is_all_read():
            self.buffer += self.reader.read_bulk()

        splitted_for_rows = self.buffer.split('\n')
        if self.reader.is_all_read():
            self.buffer = ''
        else:
            self.buffer = splitted_for_rows[-1]
            del splitted_for_rows[-1]

        return splitted_for_rows

    def get_rows( self ):
        if len( self.rows ) == 0:
            return self.read_rows()
        else:
            rows_copy = list( self.rows )
            self.rows.clear()
            return rows_copy

    def get_all_rows( self ):
        list_rows = []
        while not self.reader.is_all_read():
            list_rows += self.get_rows()

        return list_rows

    def is_row_in_buffer( self ):
        return '\n' in self.buffer


class CSVDataReceiver(DataReceiver):
    '''Receives data from a CSV file.'''
    def __init__( self, reader, delim=';', quote='"' ):
        self.reader = csvreader( reader, delimiter=delim, quotechar=quote )
        self.rows = deque()
        self.buffer = ''

    def get_rows( self ):
        print self.reader.next()
        try:
            return self.reader.next()
        except:
            return []

    def get_all_rows( self ):
        rows = []
        try:
            while True:
                rows.append( self.reader.next() )
        except:
            return rows


class BasicUploader:
    def __init__( self, receiver, meta, db ):
        self.receiver = receiver
        self.meta = meta
        self.db = db

    def upload( self ):
        init_endpoint_id = self.db.get_max_endpoint()
        init_dbtree_id = self.db.get_max_dbtree_id()
        init_data_id = self.db.get_max_data_id()
        endpoint = None # if try is not commented, this makes sense
        print init_endpoint_id, init_dbtree_id, init_data_id
        #try:
        # TODO: why it does not work \/
        self.remove_uploaded( 50009, 1016, 1000067180, 'data_50020' )
        endpoint = self.update_dbtree()
        self.update_hierarchy( endpoint )
        self.update_columns( endpoint )
        id_tree = self.upload_data( endpoint )
        raise RuntimeError # update data
        self.update_ptree( id_tree )
        #except Exception as e:
        #    self.remove_uploaded( init_endpoint_id, init_dbtree_id, init_data_id, endpoint )
        #    good_endpoint_id = 50009
        #    good_dbtree_id = 1016
        #    good_data_id = 1000067180
        #    self.remove_uploaded( good_endpoint_id, good_dbtree_id, good_data_id, endpoint )

    def update_dbtree( self ):
        parent_nodes = self.meta.get_parents()

        last_parent_id = None
        for parent in parent_nodes:
            parent_node = self.db.get_child( last_parent_id, parent['name'] )
            if parent_node is None:
                parent_node = {
                    'name': None,
                    'label': None,
                    'description': None,
                    'endpoint': None
                }
                parent_node['id'] = self.db.gen_dbtree_id()
                parent_node['parent'] = last_parent_id
                parent_node['max_depth'] = parent_node['min_depth'] = 0
                parent_node['visible'] = True
                self.db.insert_tree_node( parent_node )

            last_parent_id = parent_node['id']

        node = deepcopy( self.meta.get_node() )
        endpoint_id = self.db.gen_endpoint_id()
        node['endpoint'] = 'data_' + str( endpoint_id )
        node['id'] = self.db.gen_dbtree_id()
        self.db.insert_tree_node( node )
        self.db.update_depths( node['id'] )

        return node['endpoint']

    def update_hierarchy( self, endpoint ):
        hierarchy = self.meta.get_hierarchy()
        for (i, col) in enumerate( hierarchy ):
            if not col['aux']:
                col['aux_label'] = None
            self.db.insert_hierarchy_column( col, endpoint, i )

    def update_columns( self, endpoint ):
        non_hierarchy_columns = self.get_non_hierarchy_columns()

        for col in non_hierarchy_columns:
            column_with_same_name = self.db.get_column( col['key'], col['type'] )
            if column_with_same_name is None:
                col['endpoints'] =  [ endpoint ]
                self.db.insert_column( col )
            else:
                old_endpoints = column_with_same_name['endpoints']
                new_endpoints = old_endpoints + [ endpoint ]
                self.db.update_column_endpoints( old_endpoints, new_endpoints, col['key'], col['type'] )

    def upload_data( self, endpoint ):
        bulk = ['fdsfds']
        self.db.remove_table( endpoint )

        columns = map( lambda t: ( t['label'], t['type'] ), self.get_non_hierarchy_columns() )
        self.db.create_table( endpoint, columns )

        data = []
        hierarchy = self.meta.get_hierarchy()
        for row in bulk:
            parent_id = find_parent( row )
            if parent_id is None:
                self.insert_empty_row()
            new_row = self.insert_hierarchy( hierarchy, row )
            new_row['id'] = self.db.gen_data_id()
            new_row['parent'] = find_parent( row )
            data.append( new_row )

        self.db.insert_data( data )
        return id_tree
        
    def update_ptree( self, id_tree ):
        for t in id_tree:
            self.db.insert_ptree_list( id, parents_ids )

    def set_counters( self, endpoint_id, dbtree_id, data_id ):
        self.db.set_max_endpoint( endpoint_id )
        self.db.set_max_dbtree_id( dbtree_id )
        self.db.set_max_data_id( data_id )

    def remove_uploaded( self, endpoint_id, dbtree_id, data_id, endpoint ):
        # if something bad happens during data insertion, remove inserted data
        act_dbtree_id = self.db.get_max_dbtree_id()
        #TODO: act_dbtree_id = 1300
        act_data_id = self.db.get_max_data_id()
        for id in range( endpoint_id + 1, act_dbtree_id + 1 ):
            self.db.remove_tree_node( id )

        if endpoint is not None:
            self.db.remove_hierarchy( endpoint )
            #self.db.remove_columns( endpoint )
            self.db.remove_data( endpoint )

        for id in range( data_id + 1, act_data_id + 1 ):
            self.db.remove_ptree_list( id )

        self.set_counters( endpoint_id, dbtree_id, data_id )

    def get_non_hierarchy_columns():
        columns = self.meta.get_columns()
        hierarchy = self.meta.get_hierarchy()
        # columns that are in hierarchy will be removed and
        # 'type' and 'name' will be inserted instead of them

        hierarchy_labels = {}
        for col in hierarchy:
            hierarchy_labels[ col['label'] ] = True
        non_hierarchy_columns = filter( lambda t: t['label'] not in hierarchy_labels, columns )

        return non_hierarchy_columns


class DB:
    def __init__( self, cursor=None, conf=None):
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

    def gen_data_id( self ):
        new_max = self.get_max_data_id() + 1
        self.set_max_dbtree_id( new_max )
        return new_max

    def get_tree_node( self, id ):
        query = '''SELECT * FROM dbtree
                   WHERE id = %s
                ''' % id
        self.cursor.execute( query )
        return query.fetchone()

    def modify_insert_query( self, table, names, value ):
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
        query = self.modify_insert_query( 'dbtree', node.keys(), node )
        self.cursor.execute( query.encode('utf-8') )

    def modify_tree_node( self, id, update_dict ):
        query = '''UPDATE dbtree SET '''
        for k, v in update_dict.iteritems():
            query += ( k + '=' + str(v) )
        query += '''WHERE id = %s; COMMIT;''' % id

        self.cursor.execute( query )

    def remove_tree_node( self, id ):
        query = '''DELETE FROM dbtree
                   WHERE id = %s; COMMIT;
                ''' % id
        self.cursor.execute( query )

    def get_children( self, id ):
        if id is None:
            query = '''SELECT * FROM dbtree
                       WHERE parent is NULL'''
        else:
            query = '''SELECT * FROM dbtree
                       WHERE parent = %s''' % id
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
        query = self.modify_insert_query( 'hierarchy', obj.keys(), obj )
        self.cursor.execute( query.encode('utf-8') )

    def remove_hierarchy( self, endpoint ):
        query = '''DELETE FROM hierarchy
                   WHERE endpoint = '%s'; COMMIT;
                ''' % endpoint
        self.cursor.execute( query.encode('utf-8') )

    def get_column( self, name, type ):
        query = '''SELECT * FROM columns
                   WHERE key = '%s' AND type = '%s'
                ''' % ( name, type )
        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchone()

    def insert_column( self, column ):
        query = '''INSERT INTO columns (endpoints, key, label, format,
                                           basic, type, processable, searchable)
                   VALUES( '{%s}', '%s', '%s', '%s', %s, '%s', %s, %s ); COMMIT;
                ''' % ( column['endpoints'][0], column['key'], column['label'],
                        column['format'], column['basic'], column['type'],
                        column['processable'], column['searchable'])
        self.cursor.execute( query.encode('utf-8') )

    def update_column_endpoints( self, old_endpoints, new_endpoints, name, type ):
        old_endpoints_str = ', '.join( old_endpoints )
        new_endpoints_str = ', '.join( new_endpoints )
        query = '''UPDATE columns SET endpoints = '{%s}'
                   WHERE endpoints = '{%s}' AND key = '%s' AND type = '%s'; COMMIT;
                ''' % ( new_endpoints_str, old_endpoints_str, name, type )
        self.cursor.execute( query.encode('utf-8') )

    def get_endpoint_columns( self, endpoint ):
        # TODO
        pass

    def get_top_parent( self, id ):
        act_node = self.get_node( id )
        while act_node['parent'] is not None:
            act_node = self.get_node( act_node['parent'] )

        return act_node

    def get_or_create_node( self, node, par_id ):
        name = node['name']
        select_query = '''SELECT * FROM dbtree
                          WHERE parent = %s
                       ''' % par_id

        self.cursor.execute( select_query )
        children = self.cursor.fetchall()

        for child in children:
            if child['name'] == name:
                return child

        new_id = self.gen_dbtree_id()
        endpoint = node.get( 'endpoint', None )
        db_node = (
            new_id, par_id,
            node['name'], node['label'], node['description'],
            0, 0, # max_level, min_level
            endpoint, True
        )
        insert_query = '''INSERT INTO dbtree (id, parent, name, label,
                          description, max_depth, min_depth, endpoint, visible)
                          VALUES( %s, %s, %s, %s, %s, %s, %s, %s, %s ); COMMIT;
                       ''' % db_node

        return db_node

    def update_depths( self, subtree_id ):
        '''Update depths in subtree which root has subtree_id'''
        children = self.get_children( subtree_id )
        if children == []:
            return (0, 0)

        min_depth = 1000
        max_depth = 0
        for child in children:
            (child_min, child_max) = self.update_depths( child['id'] )
            min_depth = min( min_depth, child_min + 1 )
            max_depth = max( max_depth, child_max + 1 )

        return ( min_depth, max_depth )

    def remove_table( self, tablename ):
        query = '''DROP %s IF EXISTS;''' % tablename
        self.cursor.execute( query )

    def create_table( self, tablename, columns ):
        types_map = {
            'string': 'TEXT',
            'number': 'INT'
        }

        create_query = '''CREATE TABLE %s (
                id              INT UNIQUE NOT NULL,
                parent          INT REFERENCES %s(id),
                type            TEXT,
                name            TEXT
                ''' % ( tablename, tablename )

        for col in columns:
            col_descr = ''',%s       %s
                        ''' % ( col[0], types_map( col[1] ) )
            create_query += col_descr
        create_query += ');'
            
        self.cursor.execute( create_query )

    def insert_data( self, data, tablename ):
        # TODO:
        insert_query = '''COPY %s
                          FROM STDIN''' % tablename
        self.cursor.execute( insert_query )

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
        query = '''INSERT INTO p_tree (id, parents)
                   VALUES (%s, {%s}); COMMIT;
                ''' % (id, parents)
        self.cursor.execute( query.encode('utf-8') )

    def remove_ptree_list( self, id ):
        query = '''DELETE FROM p_tree
                   WHERE id = %s
                ''' % id
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

def upload_file(db, src):
    dsrc = data_source(src)
    hier = get_hierarchy(hier_src)
    while not is_done(src):
        bulk = get_next_bulk(dsrc)
        tweaked = tweak_data(bulk, hierarchy)
        upload_bulk(tweaked, db)

def ureader_test():
    ureader = UrlReader( 'http://google.pl', std_size=100 )
    print ureader.read_bulk()
    print ureader.read_bulk()
    print ureader.is_all_read()
    print ureader.read_bulk()
    ureader.read_all()
    print ureader.is_all_read()

def freader_test():
    freader = FileReader( 'hier.json', std_size=20 )
    print freader.read_bulk()
    print freader.read_bulk()
    print freader.is_all_read()
    print freader.read_all()
    print freader.is_all_read()


def meta_test():
    freader = FileReader( 'hier.json', std_size=20 )
    meta = Meta( freader )
    print 'node:', meta.get_node()
    print 'name:', meta.get_name()
    print 'description:', meta.get_description()
    print 'columns:', meta.get_columns()
    print 'column 1:', meta.get_column( 1 )
    print 'column 1 parameter "key":', meta.get_column_par( 1, 'key' )
    print 'hierarchy:', meta.get_hierarchy()
    print 'hierarchy column 1:', meta.get_hierarchy_column( 1 )    
    print 'hierarchy column 1 parameter aux_label:', meta.get_hierarchy_column_par( 1, 'aux_label' )
    print 'parents:', meta.get_parents()
    print 'parent 0:', meta.get_parent( 0 )
    print 'parent 0 name:', meta.get_parent_par( 0, 'name' )

def rec_test():
    f = open('hier.json', 'rb')
    print f.next()
    f.close()
    freader = FileReader( 'hier.json', std_size=20 )
    rec = DataReceiver( freader )
    print rec.get_all_rows()

def csv_test():
    freader = FileReader( 'data.csv' )
    creader = CSVDataReceiver( freader )
    print creader.get_rows()
    print creader.get_rows()
    print creader.get_rows()
    print creader.get_rows()
    print creader.get_all_rows()

def full_test():
    freader = FileReader( 'data.csv' )
    creader = CSVDataReceiver( freader )
    meta_freader = FileReader( 'hier.json' )
    meta = Meta( meta_freader )
    db = DB( conf='db.conf' )
    uploader = BasicUploader( creader, meta, db )
    uploader.upload()

if __name__ == '__main__':
    #ureader_test()
    #freader_test()
    #meta_test()
    #rec_test()
    #csv_test()
    full_test()

