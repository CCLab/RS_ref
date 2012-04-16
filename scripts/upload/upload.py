#-*- coding: utf-8 -*-

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
import os
import simplejson as json
import string

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
            'description': json_content['description'],
            'label': json_content['label']
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


class APIDataReceiver(DataReceiver):
    '''Receives data from API'''
    def __init__( self, base_url ):
        #base_url = 'http://otwartedane.pl/api/json/dataset/0/view/0/issue/2011/'
        self.rows = deque()
        self.buffer = ''
        self.base_url = base_url
        top_data_url = base_url + 'a/'
        top_reader = UrlReader( top_data_url, stop_sign=None )
        top_data = top_reader.read_all()
        json_data = json.loads( top_data )
        self.top_data = json_data['data']
        self.next_ind = 0

    def get_rows( self ):
        try:
            rows = self.get_subtree( self.top_ids[ self.next_ind ] )
            self.next_ind += 1
            return rows
        except:
            return []

    def get_all_rows( self ):
        rows = []
        try:
            while True:
                rows += self.get_rows()
        except:
            return rows

    def get_children( self, prev_url, par_id, level ):
        url = self.next_level_url( prev_url, par_id, level )
        ureader = UrlReader( url, stop_sign=None )
        children_str = ureader.read_all()
        children = json.loads( children_str )['data']
        return children

    def get_children_rec( self, prev_url, par_id, level ):
        data = []
        children = self.get_children( prev_url, par_id, level )
        for child in children:
            data.append( child )
            if not child['leaf']:
                url = self.next_level_url( prev_url, par_id, level )
                data += self.get_children_rec( url, child['idef'], level + 1 )

        return data

    def get_subtree( self, ind ):
        data = [ self.top_data[ ind ] ]
        root_id = self.top_data[ ind ]['idef']
        if not act_root['leaf']:
            data += self.get_children_rec( self.base_url, root_id, 0 )

        return data

    def next_level_url( self, prev_url, par_id, level ):
        next_level = level + 1
        next_letter = string.lowercase[ next_level ]
        return ( prev_url + '%s/%s/' % ( par_id, next_letter ) )


class BasicUploader:
    def __init__( self, receiver, meta, db ):
        self.receiver = receiver
        self.meta = meta
        self.db = db

    def upload( self, lazy=False, has_header=True ):
        # restore db state to a state before a recent data insertion
        self.debug_restore()
        init_endpoint_id = self.db.get_max_endpoint()
        init_dbtree_id = self.db.get_max_dbtree_id()
        init_data_id = self.db.get_max_data_id()
        print 'Checking db counters...'
        self.check_db_counters( init_endpoint_id, init_dbtree_id, init_data_id )

        print 'Checking metadata correctness...',
        try:
            self.check_correctness()
        except UploadDataException as e:
            print e.get_error()
            exit( 0 )
        print 'correct.'

        endpoint = None
        print 'Trying to insert data in db...',
        '''
        try:
            endpoint = self.update_dbtree()
            self.update_hierarchy( endpoint )
            self.update_columns( endpoint )
            if lazy:
                id_map = self.upload_data_stream( endpoint )
            else:
                id_map = self.upload_data( endpoint )
                self.sum_columns( endpoint )
                self.db.set_max_data_id( id_map.get_last_id() )

            self.update_ptree( id_map )
        except Exception as e:
            print e
            self.remove_uploaded( init_endpoint_id, init_dbtree_id, init_data_id )
            exit( 0 )
        print 'done.'
        '''
        endpoint = self.update_dbtree()
        self.update_hierarchy( endpoint )
        self.update_columns( endpoint )
        if lazy:
            id_map = self.upload_data_stream( endpoint )
        else:
            id_map = self.upload_data( endpoint, has_header=has_header )
            self.sum_columns( endpoint )
            self.db.set_max_data_id( id_map.get_last_id() )

        self.update_ptree( id_map )
        print 'done.'
        

    def check_correctness( self ):
        self.check_dbtree()
        self.check_columns()
        self.check_hierarchy()

    def debug_restore( self ):
        safe_endpoint_id = 50009
        safe_dbtree_id = 1016
        safe_data_id = 1000067180
        self.remove_uploaded( safe_endpoint_id, safe_dbtree_id, safe_data_id )

    def update_dbtree( self ):
        parent_nodes = self.meta.get_parents()

        parents_ids = []
        last_parent_id = None
        for parent in parent_nodes:
            parent_node = self.db.get_child( last_parent_id, parent['name'] )
            if parent_node is None:
                parent_node = {
                    'id': self.db.gen_dbtree_id(),
                    'parent': last_parent_id,
                    'name': parent['name'],
                    'label': None,
                    'description': parent['description'],
                    'endpoint': None,
                    'max_depth': 0,
                    'min_depth': 0,
                    'visible': True
                }
                self.db.insert_tree_node( parent_node )

            last_parent_id = parent_node['id']
            parents_ids.append( last_parent_id )

        endpoint_id = self.db.gen_endpoint_id()
        node = {
            'id': self.db.gen_dbtree_id(),
            'parent': last_parent_id,
            'name': self.meta.get_node()['name'],
            'label': self.meta.get_node()['label'],
            'description': self.meta.get_node()['description'],
            'endpoint': 'data_' + str( endpoint_id ),
            'max_depth': 0,
            'min_depth': 0,
            'visible': True
        }
        parents_ids.append( node['id'] )
        self.db.insert_tree_node( node )
        self.update_depths( parents_ids[0] )

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

    def upload_data( self, endpoint, has_header=True ):
        bulk = self.receiver.get_all_rows()
        bulk = self.dicts_to_lists( bulk )
        if has_header:
            del bulk[0]

        self.db.remove_table( endpoint )
        columns = map( lambda t: ( t['key'], t['type'] ), self.get_non_hierarchy_columns() )
        self.db.create_table( endpoint, columns )

        data = []
        start_id = self.db.get_max_data_id()
        id_map = IdMap( start_id )
        top_rows = []
        for row in bulk:
            hierarchy_in_row = self.get_hierarchy_cols( row )
            # clear empty fields from hierarchy columns
            while len( hierarchy_in_row ) > 0 and hierarchy_in_row[-1][0] == '':
                hierarchy_in_row.pop()
        
            new_rows = self.add_rows( id_map, hierarchy_in_row, row )
            if new_rows[0][1] is None: # if parent is none == is top row
                top_rows.append( new_rows[0] )
            data += new_rows
        total_row_id = id_map.add_id( ['Total'] )
        data.append( self.create_total_row( top_rows[0], total_row_id ) )

        filename = "upload_data.csv"
        scriptpath = os.path.realpath( __file__ )
        directory = os.path.dirname( scriptpath )
        filepath = os.path.join( directory, filename )
        #TODO: if windows
        #filepath = filepath.replace('\\', '\\\\' )

        self.save_data( data, filepath )
        self.db.insert_data( endpoint, filepath )

        return id_map

    def dicts_to_lists( self, rows ):
        if rows == [] or isinstance( rows[0], list ):
            return rows

        list_rows = []
        columns = self.meta.get_columns()
        for dict_row in rows:
            print columns
            print dict_row
            list_row = []
            for col in columns:
                list_row.append( dict_row[ col['key'] ] )
            list_rows.append( list_row )

        return list_rows

    def save_data( self, data, filepath ):
        import csv

        f = file( filepath, "wb" )
        writer = csv.writer( f, delimiter=';', quotechar='"' )
        for row in data:
            writer.writerow( self.encode_row( row ) )
        f.close()

    def upload_data_stream( self, endpoints ):
        pass
        
    def update_ptree( self, id_map ):
        root = id_map.get_root()
        for key, child in root.iteritems():
            if key != '__id__':
                self.update_ptree_helper( child, [] )

    def update_ptree_helper( self, act_parent, parents_ids ):
        act_id = act_parent['__id__']
        parents_ids_str = None if parents_ids == [] else ','.join( parents_ids )
        self.db.insert_ptree_list( act_id, parents_ids_str )
        for key, child in act_parent.iteritems():
            if key != '__id__':
                self.update_ptree_helper( child, parents_ids + [ str(act_id) ] )

    def sum_columns( self, endpoint ):
        summable_columns = ['id', 'parent'] +\
                [ col['key'] for col in self.meta.get_columns() if col['type'] == 'number' ]

        nodes = self.db.get_leaves( endpoint )
        while nodes != []:
            summed_values = self.sum_values_in_nodes( nodes, summable_columns )
            for ( id, value ) in summed_values.iteritems():
                conds = {'id': id} if id is not None else {'type': 'Total'}
                # summable_columns[2:] - remove id and parent keys
                self.db.update_node( endpoint, summable_columns[2:], value, conds )
                
            if None in summed_values:
                del summed_values[ None ]
            parents = summed_values.keys()
            nodes = self.db.get_nodes( endpoint, parents )

    def sum_values_in_nodes( self, nodes, summable_columns ):
        summed_values = {}
        for n in nodes:
            parent_id = n['parent']
            if parent_id not in summed_values:
                summed_values[ parent_id ] = {}
            for col in summable_columns:
                try:
                    summed_values[ parent_id ][ col ] += n[ col ]
                except:
                    summed_values[ parent_id ][ col ] = n[ col ]

        return summed_values

    def set_counters( self, endpoint_id, dbtree_id, data_id ):
        self.db.set_max_endpoint( endpoint_id )
        self.db.set_max_dbtree_id( dbtree_id )
        self.db.set_max_data_id( data_id )

    def remove_uploaded( self, endpoint_id, dbtree_id, data_id ):
        # if something bad happens during data insertion, remove inserted data
        act_dbtree_id = self.db.get_max_dbtree_id()
        act_data_id = self.db.get_max_data_id()
        act_endpoint_id = self.db.get_max_endpoint()
        for id in range( act_dbtree_id, dbtree_id, -1 ):
            self.db.remove_tree_node( id )

        for id in range( endpoint_id + 1, act_endpoint_id + 1 ):
            endpoint = 'data_' + str( id )
            self.db.remove_hierarchy( endpoint )
            self.db.remove_columns( endpoint )
            self.db.remove_data( endpoint )

        for id in range( data_id + 1, act_data_id + 1 ):
            self.db.remove_ptree_list( id )

        self.set_counters( endpoint_id, dbtree_id, data_id )

    def get_non_hierarchy_columns( self ):
        columns = self.meta.get_columns()
        hierarchy = self.meta.get_hierarchy()
        # columns that are in hierarchy will be removed and
        # 'type' and 'name' will be inserted instead of them

        hierarchy_labels = {}
        for col in hierarchy:
            hierarchy_labels[ col['label'] ] = True
            if col['aux']:
                hierarchy_labels[ col['aux_label'] ] = True
        non_hierarchy_columns = filter( lambda t: t['label'] not in hierarchy_labels, columns )

        return non_hierarchy_columns

    def check_dbtree( self ):
        node_fields = ['name', 'description', 'label']
        parent_fields = ['name', 'description']
        
        node = self.meta.get_node()
        for field in node_fields:
            if field not in node:
                msg = 'Missing field %s in description file.' % field
                raise UploadDataException( msg )
           
        parents = self.meta.get_parents()
        for (i, parent) in enumerate( parents ):
            for field in parent_fields:
                if field not in parent:
                    msg = 'Missing field %s in parent nr %d.' % ( field, i )
                    raise UploadDataException( msg )

    def check_columns( self ):
        obligatory_fields = ['key', 'label', 'format', 'type']
        possible_types = ['string', 'number']
        columns = self.meta.get_columns()
        for col in columns:
            for field in obligatory_fields:
                if field not in col:
                    msg = 'Missing field %s in column %s.' % ( field, col['key'] )
                    raise UploadDataException( msg )

            if col['type'] not in possible_types:
                msg = 'Unknown type %s in column %s.' % ( col['type'], col['key'] )
                raise UploadDataException( msg )

        # TODO: check also types

    def check_hierarchy( self ):
        hierarchy_labels = [ t['label'] for t in self.meta.get_hierarchy() ]
        hierarchy_labels = []
        for hier_col in self.meta.get_hierarchy():
            hierarchy_labels.append( hier_col['label'] )
            if hier_col['aux']:
                hierarchy_labels.append( hier_col['aux_label'] )

        columns_labels = {}
        for col in self.meta.get_columns():
            columns_labels[ col['label'] ] = True

        for label in hierarchy_labels:
            if label not in columns_labels:
                msg = "hierarchy column %s not in column labels." % label
                raise UploadDataException( msg.encode('utf-8') )

    def get_hierarchy_indexes_pairs( self ):
        hierarchy = self.meta.get_hierarchy()
        columns = self.meta.get_columns()
        
        ind_obj = {}
        for (i, col) in enumerate( columns ):
            try:
                ind_obj[ col['label'] ].append( i )
            except KeyError:
                ind_obj[ col['label'] ] = [ i ]

        indexes_pairs = []
        for col in hierarchy:
            first_ind = ind_obj[ col['label'] ][0]
            ind_obj[ col['label'] ] = ind_obj[ col['label'] ][1:]
            if col['aux']:
                second_ind = ind_obj[ col['aux_label'] ][0]
                ind_obj[ col['aux_label'] ] = ind_obj[ col['aux_label'] ][1:]
                ind = ( first_ind, second_ind )
            else:
                ind = ( first_ind, )
            indexes_pairs.append( ind )

        return indexes_pairs

    def get_hierarchy_indexes( self ):
        indexes_pairs = self.get_hierarchy_indexes_pairs()
        indexes = []
        for t in indexes_pairs:
            indexes.append( t[0] )
            try:
                indexes.append( t[1] )
            except:
                pass

        return indexes

    def get_hierarchy_cols( self, row ):
        hierarchy_cols = []
        hierarchy = self.meta.get_hierarchy()
        hierarchy_indexes = self.get_hierarchy_indexes_pairs()
        for ind in hierarchy_indexes:
            if len( ind ) == 1:
                hierarchy_cols.append( (row[ ind[0] ],) )
            else:  # if there is an aux column
                hierarchy_cols.append( (row[ ind[0] ], row[ ind[1] ]) )

        return hierarchy_cols

    def add_rows( self, id_map, hierarchy_in_row, row ):
        new_rows = []
        partial_hierarchy = []
        for col in hierarchy_in_row:
            if len( col ) == 2:
                next_level_hierarchy = col[0] + col[1]
            else:
                next_level_hierarchy = col[0]
            partial_hierarchy.append( next_level_hierarchy )
            if id_map.get_id( partial_hierarchy ) is None:
                if len( partial_hierarchy ) == len( hierarchy_in_row ):
                    new_row = row
                    is_leaf = True
                else:
                    new_row = self.create_empty_row()
                    is_leaf = False
                row_id = id_map.add_id( partial_hierarchy )
                par_id = id_map.get_id( partial_hierarchy[:-1] )
                row_level = len( partial_hierarchy ) - 1
                db_row = self.insert_hierarchy( col, new_row, row_level, row_id, par_id, is_leaf )
                new_rows.append( db_row )

        return new_rows

    def create_empty_row( self ):
        columns = self.meta.get_columns()
        empty_row = []
        for col in columns:
            if col['type'] == 'string':
                empty_row.append( '' )
            else:
                empty_row.append( 0 )
        
        return empty_row

    def insert_hierarchy( self, hierarchy_values, row, level, id, par_id, is_leaf ):
        hierarchy_col = self.meta.get_hierarchy_column( level )
        if hierarchy_values[0] == '':
            row_type = 'Empty'
        elif hierarchy_col['aux']:
            row_type = hierarchy_col['label'] + ' ' + hierarchy_values[1]
        else:
            row_type = hierarchy_col['label']
        row_name = hierarchy_values[0]
        indexes = self.get_hierarchy_indexes()
        indexes.sort( reverse=True )
        for i in indexes:
            del row[i]

        return  [ id, par_id, row_type, row_name, is_leaf ] + row

    def encode_row( self, row ):
        encoded_row = []
        for value in row:
            if value is None:
                value = '\N'
            if isinstance( value, unicode ):
                value = value.encode('utf-8')
            encoded_row.append( value )
        return encoded_row

    def check_db_counters( self, init_endpoint_id, init_dbtree_id, init_data_id ):
        if self.db.get_higher_dbtree( init_dbtree_id ) != []:
            print 'Found wrong dbtree nodes, higher than %d' % init_dbtree_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your decision: ')
            if dec.lower() == 'y':
                self.db.remove_higher_dbtree( init_dbtree_id )
                print 'Removed wrong dbtree nodes'
        else:
            print 'Dbtree correct'

        endpoint = 'data_' + str( init_endpoint_id )
        if self.db.get_higher_hierarchy( endpoint ) != []:
            print 'Found wrong hierarchy columns, higher than %d' % init_endpoint_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your decision: ')
            if dec.lower() == 'y':
                self.db.remove_higher_hierarchy( endpoint )
                print 'Removed wrong hierarchy columns'
        else:
            print 'Hierarchy correct'

        # TODO: check if there are columns for endpoints with too high id

        if self.db.get_higher_ptree( init_data_id ) != []:
            print 'Found wrong ptree nodes, higher than %d' % init_data_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your_decision: ')
            if dec.lower() == 'y':
                self.db.remove_higher_ptree( init_data_id )
                print 'Removed wrong ptree nodes'
        else:
            print 'Ptree correct'

        tables_names = self.db.get_higher_datatables( init_endpoint_id )
        if tables_names != []:
            print 'Found too many tables, higher than %d' % init_endpoint_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your decision: ')
            if dec.lower() == 'y':
                self.db.drop_higher_datatables( init_endpoint_id )
                print 'Removed wrong data tables:'
                for tname in tables_names:
                    print 'Removed table', tname
        else:
            print 'Data tables correct'

    def update_depths( self, subtree_id ):
        '''Update depths in subtree which root has subtree_id'''
        children = self.db.get_children( subtree_id )
        if children == []:
            return (0, 0)

        min_depth = 1000
        max_depth = 0
        for child in children:
            (child_min, child_max) = self.update_depths( child['id'] )
            min_depth = min( min_depth, child_min + 1 )
            max_depth = max( max_depth, child_max + 1 )

        self.db.update_dbtree_depth( subtree_id, min_depth, max_depth )
        return ( min_depth, max_depth )

    def create_total_row( self, top_row, total_row_id ):
        total_row = [
            total_row_id,
            None,
            'Total',
            'Ogółem',
            True
        ]
        for value in top_row[5:]:
            if value is None:
                total_row.append( value )
            elif isinstance( value, basestring ):
                total_row.append( '' )
            else: # number value
                total_row.append( 0 )

        return total_row


class IdMap:
    def __init__( self, start_id ):
        self.ids = { '__id__': None }
        self.act_id = start_id

    def get_root( self ):
        return self.ids

    def add_id( self, hierarchy_list ):
        parent = self.ids
        for el in hierarchy_list:
            if el not in parent:
                self.act_id += 1
                new_id = self.act_id
                parent[ el ] = { '__id__': new_id }
            else:
                parent = parent[ el ]
        return new_id

    def get_id( self, hierarchy_list ):
        parent = self.ids
        for el in hierarchy_list:
            if el not in parent:
                return None
            else:
                parent = parent[ el ]

        return parent['__id__']

    def get_last_id( self ):
        return self.act_id


class UploadDataException( Exception ):
    def __init__( self, msg ):
        self.msg = msg

    def __str__( self ):
        return 'UploadDataException: ' + self.msg

    def get_error( self ):
        return self.msg


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

    def get_endpoint_columns( self, endpoint ):
        query = '''SELECT * FROM columns
                   WHERE '%s' = ANY(endpoints)
                ''' % endpoint
        self.cursor.execute( query.encode('utf-8') )
        return self.cursor.fetchall()

    def get_top_parent( self, id ):
        act_node = self.get_node( id )
        while act_node['parent'] is not None:
            act_node = self.get_node( act_node['parent'] )

        return act_node

    def get_top_level( self, endpoint ):
        query = '''SELECT * FROM %s WHERE parent is NULL''' % endpoint
        self.cursor.execute( query.encode('utf-8') )

        return self.cursor.fetchall()

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
        query = '''UPDATE %s SET ''' % endpoint
        for k in keys:
            query += '%s = (%s + %s), ' % ( k, k, value[k] )

        query = query[:-2] # remove last AND

        query += ' WHERE '
        for k, where_value in where.iteritems():
            if isinstance( where_value, basestring ):
                query += '''%s = '%s' AND ''' % (k, where_value )
            else:
                query += '%s = %s AND ' % (k, where_value )
        query = query[:-4] # remove last AND
        query += '; COMMIT;'

        self.cursor.execute( query.encode('utf-8') )

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

    def update_dbtree_depth( self, id, min_depth, max_depth ):
        query = '''UPDATE dbtree SET min_depth = %s, max_depth = %s
                   WHERE id = %s''' % ( min_depth, max_depth, id )
        
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
        query = self.modify_insert_query( 'p_tree', obj.keys(), obj )
        self.cursor.execute( query.encode('utf-8') )

    def remove_ptree_list( self, id ):
        query = '''DELETE FROM p_tree
                   WHERE id = %s
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
    #freader = FileReader( 'data.csv' )
    freader = FileReader( 'data_0_0_2011.csv' )
    creader = CSVDataReceiver( freader )
    #meta_freader = FileReader( 'hier.json' )
    meta_freader = FileReader( 'hier_0_0_2011.json' )
    meta = Meta( meta_freader )
    db = DB( conf='db.conf' )
    uploader = BasicUploader( creader, meta, db )
    uploader.upload( has_header=False )

if __name__ == '__main__':
    #ureader_test()
    #freader_test()
    #meta_test()
    #rec_test()
    #csv_test()
    #full_test()

    old_file = os.path.join( 'new', 'data_0_0_2011.csv' )
    meta_file = os.path.join( 'hier', 'hier_0_0_2011.json' )
    freader = FileReader( old_file )
    creader = CSVDataReceiver( freader )
    meta_freader = FileReader( meta_file )
    meta = Meta( meta_freader )
    db = DB( conf='db.conf' )
    uploader = BasicUploader( creader, meta, db )
    uploader.upload( has_header=False )
