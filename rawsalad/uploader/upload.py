#-*- coding: utf-8 -*-

from copy import deepcopy
import os

from readers import FileReader as FileReader
from readers import CSVDataReceiver as CSVDataReceiver
from readers import Meta as Meta
from db import DB as DB
from verification import verify_data

import simplejson as json


with open( 'trans.json', 'rb' ) as trans_file:
    content = trans_file.read()
    translation = json.loads( content )

def trans( key ):
    if key not in translation:
        print 'WARNING: key %s not in translation' % key
    return translation.get( key, '???' )



class Uploader:
    '''Upload data into db. Uses receiver to get data to upload, meta to
        meta data and db as an interface to db. If debug mode is set on,
        errors are caught and exit is called, otherwise django gets errors.'''
    def __init__( self, receiver, meta, db, debug=True ):
        self.receiver = receiver
        self.meta = meta
        self.db = db
        self.debug = debug

    def upload( self, has_header=True, output=None, visible=True, restore=False ):
        '''Main method of Uploader. Checks db counters, if any inconsistency
        is found, then ask if it should be removed. After that, checks data
        that is about to be uploaded. After this attempts to upload data.
        If any error occurs during that process, then removes uploaded data to
        that moment. Returns tuple containg boolean value that tells if it
        succeeded and name of the new endpoint.
        There are 4 optional parameters: has_header - if data file comes with header,
        output - name of CSV file that will be used to COPY into db,
        visible - if endpoint should be visible after upload,
        restore - if state of db should be restored to the state pointed in debug_restore()
                  method. Use with CAUTION!
        '''
        # restore db state to a state before a recent data insertion
        if restore:
            self.debug_restore()

        # Check db counters
        init_endpoint_id = self.db.get_max_endpoint()
        init_dbtree_id = self.db.get_max_dbtree_id()
        init_data_id = self.db.get_max_data_id()
        print 'Checking db counters...'
        self.check_db_counters( init_endpoint_id, init_dbtree_id, init_data_id )

        # Check if parents, columns and hierarchy from meta is correct
        print 'Checking metadata correctness...',
        try:
            self.check_correctness()
        except UploadDataException as e:
            print e.get_error()
            return ( False, e.get_error() )

        print 'correct.'

        # Check data, if any error is in data, stop processing and return list with errors
        print 'Looking for errors in data...',
        errors = self.find_errors( has_header )
        if errors != []:
            print '%d error(s) found' % len( errors )
            return (False, errors)

        print 'no errors found'
        

        endpoint = None
        print 'Trying to insert data into db...',
        if not self.debug:
            try:
                endpoint = self.insert_data_into_db( has_header, output, visible )
            except UploadDataException as e:
                print 'failed.'
                print e
                self.remove_uploaded( init_endpoint_id, init_dbtree_id, init_data_id )
                exit( 0 )
        else:
            endpoint = self.insert_data_into_db( has_header, output, visible )

        print 'done.'
        return (True, endpoint)

    def get_data( self, has_header=False ):
        '''Gets data, if data was previously read, then gets data
            from the object, otherwise reads the file.
            If has_header is True, then first line in data file is header.'''
        bulk = self.receiver.get_all_rows()
        if bulk == []:
            return self.data
        else:
            bulk = self.dicts_to_lists( bulk )
            if has_header:
                self.header = bulk[0]
                self.data = bulk[1:]
            else:
                self.data = bulk

            return self.data

    def find_errors( self, has_header ):
        '''Looks for errors in data from the file, returns list of found
            errors, if no errors were found, returns an empty list.
            If has_header is True, then first line in data file is header.'''
        data = self.get_data( has_header )
        hierarchy = self.meta.get_hierarchy()
        columns = self.meta.get_columns()
        hierarchy_indexes = self.get_hierarchy_indexes()

        start_ind = 2 if has_header else 1
        return verify_data( data, columns, hierarchy_indexes, start_ind )
            
        
    def insert_data_into_db( self, has_header, output, visible ):
        '''Inserts node (or nodes if new parents) into dbtree, uploads new hierarchy
            and columns, then uploads data, sums columns of higher level nodes and
            updates db data counter. Updates ptree. Returns new endpoint's name.'''
        endpoint = self.update_dbtree( visible )

        self.update_hierarchy( endpoint )
        self.update_columns( endpoint )

        # Return object describing hierarchy between rows in uploaded data, what
        # will be used during updating ptree.
        id_map = self.upload_data( endpoint, has_header=has_header, output=output )

        self.sum_columns( endpoint )
        self.db.set_max_data_id( id_map.get_last_id() )

        self.update_ptree( id_map )

        return endpoint


    def check_correctness( self ):
        self.check_dbtree()
        self.check_columns()
        self.check_hierarchy()

    def debug_restore( self ):
        '''Restore state of database to the state pointed by counters.
        Use with caution.'''
        safe_endpoint_id = 50009
        safe_dbtree_id = 1016
        safe_data_id = 1000067180
        self.remove_uploaded( safe_endpoint_id, safe_dbtree_id, safe_data_id )

    def update_dbtree( self, visible ):
        '''Insert data of new node and his parents if they are new. Return name
            of new endpoint. Update depths parameters in parent nodes.'''
        parent_nodes = self.meta.get_parents()

        parents_ids = []
        last_parent_id = None
        # Insert new parents into db.
        for parent in parent_nodes:
            # Get node with given parent id and parent's name.
            parent_node = self.db.get_child( last_parent_id, parent['name'] )
            # If such a node does not exist, create it.
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
                    'visible': visible
                }
                self.db.insert_tree_node( parent_node )

            last_parent_id = parent_node['id']
            parents_ids.append( last_parent_id )

        # If the new node's name is not unique on his level(the node + siblings)
        if self.db.get_child( last_parent_id, parent['name'] ) is not None:
            parent_id = "None" if last_parent_id is None else str( last_parent_id )
            msg = '''Trying to insert dbtree node with name %s and parent id = %s, but
                     there already exists such a node.
                  ''' % ( self.meta.get_node()['name'], parent_id )
            raise UploadDataException( msg )

        # Insert the new node
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
            'visible': visible
        }
        parents_ids.append( node['id'] )
        self.db.insert_tree_node( node )

        # Update min_depth and max_depth
        self.update_depths( parents_ids[0] )

        return node['endpoint']

    def update_hierarchy( self, endpoint ):
        '''Copy hierarchy, remove not needed fields and upload hierarchy
            description.'''
        hierarchy = self.meta.get_hierarchy()

        for (i, col) in enumerate( hierarchy ):
            col_copy = deepcopy( col )

            # Remove unnecessary fields
            if not col_copy['aux']:
                col_copy['aux_label'] = None
            del col_copy['index']
            del col_copy['aux_index']

            self.db.insert_hierarchy_column( col_copy, endpoint, i )

    def update_columns( self, endpoint ):
        '''Insert columns into db if no column with such parameters exist(key, type),
            otherwise add endpoint to endpoints list for this column.'''
        non_hierarchy_columns = self.meta.get_columns()[:]

        for col in non_hierarchy_columns:
            column_with_same_name = self.db.get_column( col['key'], col['type'], col['basic'] )
            # New column
            if column_with_same_name is None:
                col['endpoints'] =  [ endpoint ]
                self.db.insert_column( col )
            # Column already exists, append only endpoint
            else:
                old_endpoints = column_with_same_name['endpoints']
                new_endpoints = old_endpoints + [ endpoint ]
                self.db.update_column_endpoints( old_endpoints, new_endpoints, col['key'], col['type'] )

    def upload_data( self, endpoint, has_header=True, output=None ):
        '''Remove table for endpoint = given endpoint(if exists) and create a new
            one for new data. Create IdMap to track dependencies between nodes and
            create IDs. If has_header = True, then omit the first line. Transform
            rows from original data to rows without hierarchy, and create hierarchy
            rows, insert both groups to CSV file(named output or defualt name)
            which will be used to COPY data into db. Save it and perform COPY.
            Return IDMap object.
        '''
        bulk = self.get_data( has_header )

        # Create and remove table
        self.db.remove_table( endpoint )
        columns = map( lambda t: ( t['key'], t['type'] ), self.meta.get_columns() )
        self.db.create_table( endpoint, columns )

        data = []
        start_id = self.db.get_max_data_id()
        id_map = IdMap( start_id )
        top_rows = []

        # Process all rows
        for row in bulk:
            # Retrieve hierarchy from the row
            hierarchy_in_row = self.get_hierarchy_cols( row )
            # Remove empty fields from hierarchy columns
            while len( hierarchy_in_row ) > 0 and hierarchy_in_row[-1][0] == '':
                hierarchy_in_row.pop()
        
            # Transform rows to non hierarchical form
            new_rows = self.add_rows( id_map, hierarchy_in_row, row )
            if new_rows[0][1] is None: # if parent is none == is top row
                top_rows.append( new_rows[0] )
            data += new_rows

        # Add total row
        total_row_id = id_map.add_id( [ trans('py_total') ] )
        data.append( self.create_total_row( top_rows[0], total_row_id ) )

        if output is None:
            filename = "upload_data.csv"
            scriptpath = os.path.realpath( __file__ )
            directory = os.path.dirname( scriptpath )
            filepath = os.path.join( directory, filename )
        else:
            filepath = output

        # Save data in CSV file, use it to upload data
        self.save_data( data, filepath )
        self.db.insert_data( endpoint, filepath )

        return id_map

    def dicts_to_lists( self, rows ):
        '''List -> Dict: l[0] -> l'''
        if rows == [] or isinstance( rows[0], list ):
            return rows

        list_rows = []
        columns = self.meta.get_columns()
        for dict_row in rows:
            list_row = []
            for col in columns:
                list_row.append( dict_row[ col['key'] ] )
            list_rows.append( list_row )

        return list_rows

    def save_data( self, data, filepath ):
        '''Save data in CSV file.'''
        import csv

        with file( filepath, 'wb' ) as f:
            writer = csv.writer( f, delimiter=';', quotechar='"' )
            for row in data:
                writer.writerow( self.encode_row( row ) )

    def update_ptree( self, id_map ):
        '''Update ptree table using ID map object.'''
        root = id_map.get_root()
        for key, child in root.iteritems():
            # For the key holding a child
            if key != '__id__':
                self.update_ptree_helper( child, [] )

    def update_ptree_helper( self, act_parent, parents_ids ):
        '''Helper function called recursively: for actual element insert list with
            parents IDS to ptree. Do the same for its children, but with list
            with its ID appended.'''
            
        act_id = act_parent['__id__']
        parents_ids_str = None if parents_ids == [] else ','.join( parents_ids )
        # Update ptree for this element
        self.db.insert_ptree_list( act_id, parents_ids_str )

        # Update ptree for its children
        for key, child in act_parent.iteritems():
            if key != '__id__':
                self.update_ptree_helper( child, parents_ids + [ str(act_id) ] )

    def sum_columns( self, endpoint ):
        '''Update non leaves from endpoint: sum values in their number-type columns.'''
        # Get summable columns keys, id and parent will not be summed but are needed
        summable_columns = ['id', 'parent'] +\
                [ col['key'] for col in self.meta.get_columns() if col['type'] == 'number' ]

        #Get values from leaves and update their parents, then their parents' parents, ...
        nodes = self.db.get_leaves( endpoint )
        while nodes != []:
            summed_values = self.sum_values_in_nodes( nodes, summable_columns )
            # Update nodes
            for ( id, value ) in summed_values.iteritems():
                conds = {'id': id} if id is not None else {'type': trans('py_total')}
                # summable_columns[2:] - remove id and parent keys
                self.db.update_node( endpoint, summable_columns[2:], value, conds )
                
            # Remove None - top level nodes have not parent
            if None in summed_values:
                del summed_values[ None ]

            # Get parent IDs and repeat procedure for them.
            parents = summed_values.keys()
            nodes = self.db.get_nodes( endpoint, parents )

    def sum_values_in_nodes( self, nodes, summable_columns ):
        '''Return dict with parent nodes with summed number values from their children.'''
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
        '''Remove uploaded data: dbtree nodes that have higher ids that
        dbtree_id, endpoints, columns, hierarchy with ids higher that
        endpoint_id, nodes in ptree with id higher than data_id.'''
        act_dbtree_id = self.db.get_max_dbtree_id()
        act_data_id = self.db.get_max_data_id()
        act_endpoint_id = self.db.get_max_endpoint()

        # Remove bad dbtree nodes
        for id in range( act_dbtree_id, dbtree_id, -1 ):
            self.db.remove_tree_node( id )

        # Remove hierarchy, columns and data for given endpoints.
        for id in range( endpoint_id + 1, act_endpoint_id + 1 ):
            endpoint = 'data_' + str( id )
            self.db.remove_hierarchy( endpoint )
            self.db.remove_columns( endpoint )
            self.db.remove_data( endpoint )

        # Remove relations from ptree for given data.
        for id in range( data_id + 1, act_data_id + 1 ):
            self.db.remove_ptree_list( id )

        # Reset counters to match the new order.
        self.set_counters( endpoint_id, dbtree_id, data_id )

    def check_dbtree( self ):
        '''Check if new endpoint description and its parents contain needed fields.'''
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
        '''Check each column if it has needed fields and values in those
            fields are expected (for fields that have expected values).'''
        obligatory_fields = ['key', 'label', 'format', 'type']
        possible_types = ['string', 'number']
        columns = self.meta.get_columns()

        for col in columns:
            # Check if column has needed fields
            for field in obligatory_fields:
                if field not in col:
                    msg = 'Missing field %s in column %s.' % ( field, col['key'] )
                    raise UploadDataException( msg )

            # Check if type is expected
            if col['type'] not in possible_types:
                msg = 'Unknown type %s in column %s.' % ( col['type'], col['key'] )
                raise UploadDataException( msg )

    def check_hierarchy( self ):
        '''Check if hierarchy elements have needed fields.'''
        for hier_col in self.meta.get_hierarchy():
            try:
                hier_col['label']
                hier_col['index']
                if hier_col['aux']:
                    hier_col['aux_label']
                    hier_col['aux_index']
            except:
                msg = 'Missing field in hierarchy description %s.' % hier_col
                raise UploadDataException( msg )

    def get_hierarchy_indexes_pairs( self ):
        '''Return list with tuples with indexes of hierarchy columns. For column
            without auxiliary field tuple contains one index, for column with
            auxiliary field it contains also auxiliary index.'''
        indexes_pairs = []
        for level in self.meta.get_hierarchy():
            if level['aux_index'] != -1:
                ind = ( level['index'], level['aux_index'] )
            else:
                ind = ( level['index'], )
            indexes_pairs.append( ind )

        return indexes_pairs

    def get_hierarchy_indexes( self ):
        '''Return list of hierarchy columns indexes.'''
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
        '''Get hierarchy columns in the given row, return them as a list of
            tuples. For column without aux column, tuple contains value of
            hierarchy field, for column with aux column, tuple contains value
            of hierarchy field and auxiliary hierarchy field.'''
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
        '''Return hierarchy rows for the given row (those that were not added
            to id map) and row without hierarchy. Update id_map object with new
            hierarchy.'''
        new_rows = []
        partial_hierarchy = []

        for col in hierarchy_in_row:
            # If column has auxiliary field
            if len( col ) == 2:
                next_level_hierarchy = col[0] + col[1]
            else:
                next_level_hierarchy = col[0]

            partial_hierarchy.append( next_level_hierarchy )

            # If this hierarchy is new, add it to id map
            if id_map.get_id( partial_hierarchy ) is None:
                # If it is leaf, it will be inserted into db, otherwise
                # new empty row should be created
                if len( partial_hierarchy ) == len( hierarchy_in_row ):
                    new_row = row
                    is_leaf = True
                else:
                    new_row = self.create_empty_row()
                    is_leaf = False

                # Obligatory row fields
                row_id = id_map.add_id( partial_hierarchy )
                par_id = id_map.get_id( partial_hierarchy[:-1] )
                row_level = len( partial_hierarchy ) - 1

                # Remove hierarchy from the new row, so that it is ready to upload
                db_row = self.remove_hierarchy( col, new_row, row_level, row_id, par_id, is_leaf )
                new_rows.append( db_row )

        return new_rows

    def create_empty_row( self ):
        '''Create empty row with fields: 0 for numbers and '' for strings.'''
        columns = self.meta.get_columns()
        empty_row = []
        # Create row with columns
        for col in columns:
            if col['type'] == 'number':
                empty_row.append( 0 )
            else:
                empty_row.append( '' )

        # Add to the row fields coresponding to hierarchy, so that it has
        # the same form as other rows.
        indexes = self.get_hierarchy_indexes()
        indexes.sort()
        for ind in indexes:
            empty_row.insert( ind, '' )
        
        return empty_row

    def remove_hierarchy( self, hierarchy_values, row, level, id, par_id, is_leaf ):
        '''Remove hierarchy columns from row, insert id, parent, level and leaf columns.'''
        hierarchy_col = self.meta.get_hierarchy()[ level ]

        # Choose row type: Empty if empty hierarchy column
        if hierarchy_values[0] == '':
            row_type = 'Empty'
        # with auxiliary column -> column name + value (e.g. function 1)
        elif hierarchy_col['aux']:
            row_type = hierarchy_col['label'] + ' ' + hierarchy_values[1]
        else:
        # without auxiliary column -> column name (e.g. function)
            row_type = hierarchy_col['label']

        row_name = hierarchy_values[0]

        # Remove hierarchy columns
        indexes = self.get_hierarchy_indexes()
        indexes.sort( reverse=True )
        for i in indexes:
            del row[i]

        return  [ id, par_id, row_type, row_name, is_leaf ] + row

    def encode_row( self, row ):
        '''Enocode row with utf-8 encoding, replace None fields with \N.'''
        encoded_row = []
        for value in row:
            if value is None:
                value = '\N'
            if isinstance( value, unicode ):
                value = value.encode('utf-8')
            encoded_row.append( value )

        return encoded_row

    def check_db_counters( self, init_endpoint_id, init_dbtree_id, init_data_id ):
        '''Check consistency of db counters and data in the database(if no data
            has higher counter than db counter. If such a situation happens,
            ask if it should be removed.'''
        # Check db tree nodes
        if self.db.get_higher_dbtree( init_dbtree_id ) != []:
            print 'Found wrong dbtree nodes, higher than %d' % init_dbtree_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your decision: ')
            if dec.lower() == 'y':
                self.db.remove_higher_dbtree( init_dbtree_id )
                print 'Removed wrong dbtree nodes'
        else:
            print 'Dbtree correct'

        # Check hierarchy
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
        if self.db.get_higher_columns( endpoint ):
            print 'Found wrong columns, higher than %d' % init_endpoint_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your decision: ')
            if dec.lower() == 'y':
                self.db.remove_higher_columns( endpoint )
                print 'Removed wrong columns'
        else:
            print 'Columns correct'

        # Check relations in ptree
        if self.db.get_higher_ptree( init_data_id ) != []:
            print 'Found wrong ptree nodes, higher than %d' % init_data_id
            print 'Do you want to remove them? (Y/N)'
            dec = raw_input('Your_decision: ')
            if dec.lower() == 'y':
                self.db.remove_higher_ptree( init_data_id )
                print 'Removed wrong ptree nodes'
        else:
            print 'Ptree correct'

        # Remove tables with incorrect endpoints data
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
        '''Recursively update depths in subtree which root has subtree_id,
            return tuple with min_depth and max_depth in subtree_id node.'''
        children = self.db.get_children( subtree_id )
        if children == []:
            return (0, 0)

        min_depth = 1000
        max_depth = 0

        # Recursively find min_depth and max_depth in the node
        for child in children:
            (child_min, child_max) = self.update_depths( child['id'] )
            min_depth = min( min_depth, child_min + 1 )
            max_depth = max( max_depth, child_max + 1 )

        self.db.update_dbtree_depth( subtree_id, min_depth, max_depth )
        return ( min_depth, max_depth )

    def create_total_row( self, top_row, total_row_id ):
        '''Create total row, use top row to find types in further columns.'''
        total_row = [
            total_row_id,
            None,
            trans('py_total'),
            trans('py_total_name'),
            True
        ]

        print top_row
        # Copy types from top row.
        for value in top_row[5:]:
            if value is None:
                total_row.append( None )
            elif isinstance( value, basestring ):
                total_row.append( '' )
            else: # number value
                total_row.append( 0 )

        return total_row


class IdMap:
    '''Simple class to save information about hierarchy in data in a tree-like
        structure and create IDs for data rows.'''
    def __init__( self, start_id ):
        self.ids = { '__id__': None }
        self.act_id = start_id

    def get_root( self ):
        return self.ids

    def add_id( self, hierarchy_list ):
        '''Get to element which hierarchy is = hierarchy_list, if new hierarchy
            levels should be created, create for them also ID. Return id of the
            new element.'''
        parent = self.ids

        for el in hierarchy_list:
            # New element in hierarchy
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
    '''Simple exception class'''
    def __init__( self, msg ):
        self.msg = msg

    def __str__( self ):
        return 'UploadDataException: ' + self.msg

    def get_error( self ):
        return self.msg


def upload_collection( data_file, meta_file, output_file, has_header, visible ):
    '''Upload collection into db. Data should be in data_file, meta dat in meta_file.
        CSV data file used to COPY into db will be created as output_file.
        has_header if the first row in data_file is header, visible means that collections
        should be visible in the frontend.'''
    freader = FileReader( data_file )
    creader = CSVDataReceiver( freader )

    meta_freader = FileReader( meta_file )
    meta = Meta( meta_freader )

    db = DB( conf='db.conf' )

    uploader = Uploader( creader, meta, db )
    success, endpoint = uploader.upload( has_header=has_header, output=output_file, visible=visible )

    return (success, endpoint)

if __name__ == '__main__':
    '''
    There should be 3 passed arguments:
    - name of file with data
    - name of file with collection decription
    - name of output file ready to upload data to Postgres
    '''
    import sys
    args = sys.argv
    if len( args ) != 4:
        print "Wrong number of arguments. Should be 3 instead of ", len( args ) - 1
        exit()

    data_file = args[1]   
    meta_file = args[2]   
    output_file = args[3]   

    upload_collection( data_file, meta_file, output_file, True )

