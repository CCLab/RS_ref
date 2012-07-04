#-*- coding: utf-8 -*-

from copy import deepcopy
import os
import csv
import re

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
    '''Upload data into db. Uses file with fname name to get data to upload, meta to
        meta data and db as an interface to db. If debug mode is set on,
        errors are caught and exit is called, otherwise django gets errors.'''
    def __init__( self, fname, meta, db, debug=True ):
        self.fname = fname
        self.meta = meta
        self.db = db
        self.debug = debug

    def upload( self, has_header=True, visible=True, restore=False ):
        '''Main method of Uploader. Checks db counters, if any inconsistency
        is found, then ask if it should be removed. After that, checks data
        that is about to be uploaded. After this attempts to upload data.
        If any error occurs during that process, then removes uploaded data to
        that moment. Returns tuple containg boolean value that tells if it
        succeeded and name of the new endpoint.
        There are 4 optional parameters: has_header - if data file comes with header,
        visible - if endpoint should be visible after upload,
        restore - if state of db should be restored to the state pointed in debug_restore()
                  method. Use with CAUTION!
        '''
        # restore db state to a state before a recent data insertion
        restore = False
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
        errors = []
        errors = self.find_errors( has_header )
        if errors != []:
            print '%d error(s) found' % len( errors )
            return (False, errors)

        print 'no errors found'
        
        endpoint = None
        print 'Trying to insert data into db...',
        if not self.debug:
            try:
                endpoint = self.insert_data_into_db( has_header, visible )
            except UploadDataException as e:
                print 'failed.'
                print e
                self.remove_uploaded( init_endpoint_id, init_dbtree_id, init_data_id )
                exit( 0 )
        else:
            endpoint = self.insert_data_into_db( has_header, visible )

        print 'done.'
        return (True, endpoint)

    def get_data( self, has_header=False ):
        '''Gets data, if data was previously read, then gets data
            from the object, otherwise reads the file.
            If has_header is True, then first line in data file is header.'''
        f = open( self.fname, 'rb' )
        self.reader = UnicodeReader( f, quotechar='"', delimiter=';' )
        if has_header:
            self.reader.next()
        return self.reader

    def find_errors( self, has_header ):
        '''Looks for errors in data from the file, returns list of found
            errors, if no errors were found, returns an empty list.
            If has_header is True, then first line in data file is header.'''
        hierarchy = self.meta.get_hierarchy()
        columns = self.meta.get_columns()
        hierarchy_indexes = self.get_hierarchy_indexes()
        data = self.get_data( has_header )

        start_ind = 2 if has_header else 1
        return verify_data( data, columns, hierarchy_indexes, start_ind )
            
        
    def insert_data_into_db( self, has_header, visible ):
        '''Inserts node (or nodes if new parents) into dbtree, uploads new hierarchy
            and columns, then uploads data, sums columns of higher level nodes and
            updates db data counter. Updates ptree. Returns new endpoint's name.'''
        print 'Uploading...'

        endpoint = self.update_dbtree( visible )
        print 'Dbtree uploaded'

        self.update_hierarchy( endpoint )
        print 'Hierarchy uploaded'

        self.update_columns( endpoint )
        print 'Columns uploaded'

        # Return id of the last uploaded row
        last_id = self.upload_data( endpoint, has_header=has_header )
        print 'Data uploaded'
        print 'Columns summed up, ptree uploaded'

        self.db.set_max_data_id( last_id )

        print 'Ptree uploaded'

        return endpoint


    def check_correctness( self ):
        self.check_dbtree()
        self.check_columns()
        self.check_hierarchy()

    def debug_restore( self ):
        '''Restore state of database to the state pointed by counters.
        Use with caution.'''
        # safe without bestia
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

    def upload_data( self, endpoint, has_header=True ):
        '''Remove table for endpoint = given endpoint(if exists) and create a new
            one for new data. Create IdMap to track parent-child relations between
            nodes. If has_header = True, then omit the first line. Transform rows
            from original data to rows without hierarchy, and create hierarchy
            rows. Return max id of nodes from the collection.
        '''
        def db_type( col_type, col_format ):
            if col_type == 'number':
                return 'int' if col_format.endswith('##0') else 'float'
            else:
                return col_type
        def type_fun( col_type, col_format ):
            return int if db_type( col_type, col_format ) == 'int' else float

        bulk = self.get_data( has_header )

        # Create and remove table
        self.db.remove_table( endpoint )
        columns = map( lambda t: ( t['key'], db_type(t['type'], t['format']) ),
                       self.meta.get_columns() )
        self.db.create_table( endpoint, columns )

        summable_cols = []
        for (i, col) in enumerate( self.meta.get_columns() ):
            if col['type'] == 'number':
                summable_cols.append( (i+5, type_fun(col['type'], col['format'])) )

        start_id = self.db.get_max_data_id()
        id_map = IdMap( start_id )

        batch_size = self.count_batch_size()
        print 'BATCH_SIZE = ', batch_size # Process all rows
        # rows to be uploaded in one batch
        batch_rows = []
        # rows that are actually processed, they need to be remembered,
        # because numeric fields should be summed from many leaves
        proc_rows = []
        # hierarchy
        ptree_hier = []
        # ptree rows to be uploaded in one batch
        batch_ptree_rows = []
        # list representing values in hierarchy fields
        old_hierarchy_in_row = []
        total_row = self.create_total_row( None )

        for (i, row) in enumerate( bulk ):
            if i % 1000 == 0:
                print i
            # retrieve hierarchy from the row
            hierarchy_in_row = self.get_hierarchy_cols( row )
            # remove empty fields from hierarchy columns
            while len( hierarchy_in_row ) > 0 and hierarchy_in_row[-1][0] == '':
                hierarchy_in_row.pop()
            
            common_level = self.hierarchy_common_level( hierarchy_in_row,
                                                        old_hierarchy_in_row )
            # Transform rows to non hierarchical form
            new_rows = self.add_rows( id_map, common_level, hierarchy_in_row, row )
            ptree_hier, new_ptree_rows = self.create_ptree_rows( common_level,
                                            len( hierarchy_in_row ),
                                            new_rows, ptree_hier )

            leaf_row = new_rows[-1]
            # remove rows that are not needed to sum values anymore
            # (all their children were added) and if there is top level
            # row in them, then add values from it to total row
            if i > 0:
                if common_level == 0:
                    self.sum_values( total_row, proc_rows[0], summable_cols )
                batch_rows += proc_rows[common_level:]
                proc_rows = proc_rows[:common_level]

            proc_rows += new_rows
            # sum from last but one row using values from leaf row
            for i in range( len(proc_rows) - 2, -1, -1):
                self.sum_values( proc_rows[i], leaf_row, summable_cols )

            old_hierarchy_in_row = hierarchy_in_row
            batch_ptree_rows += new_ptree_rows

            if len( batch_rows ) > batch_size:
                self.db.insert_data( batch_rows, endpoint )
                batch_rows = []
                self.db.insert_ptree_data( batch_ptree_rows )
                batch_ptree_rows = []


        batch_rows += proc_rows
        # add values from the last top row to total row
        self.sum_values( total_row, proc_rows[-1], summable_cols )

        # TODO: changed
        # TODO: get rid of magic numbers
        total_row_id = id_map.add_id( 0, 1 )[0]
        total_row[0] = total_row_id
        #total_row = self.create_total_row( total_row_id )
        batch_rows.append( total_row )
        batch_ptree_rows.append( (total_row_id, []) )

        self.db.insert_data( batch_rows, endpoint )
        self.db.insert_ptree_data( batch_ptree_rows )

        return id_map.get_last_id()

    def hierarchy_common_level( self, hierarchy_in_row, old_hierarchy_in_row ):
        common_level = 0
        for new, old in zip( hierarchy_in_row, old_hierarchy_in_row ):
            if new != old:
                break
            common_level += 1

        # level should be corrected when for example old: A-B-<empty>, new: A-B-C
        # and A-B-<empty> is not parent of A-B-C
        if (common_level == len( hierarchy_in_row ) or\
            common_level == len( old_hierarchy_in_row )) and common_level > 0:
            common_level -= 1

        return common_level


    def create_ptree_rows( self, common_level, hier_len, rows, ptree_hier ):
        if common_level == hier_len and common_level > 0:
            common_level -= 1

        base_hier = ptree_hier[:common_level]
        new_hier = [ row[0] for row in rows ]

        new_ptree_rows = []
        for (i, rowid) in enumerate( new_hier ):
            new_ptree_rows.append( (rowid, base_hier + new_hier[:i]) )
        
        return ( base_hier + new_hier, new_ptree_rows )

    def count_batch_size( self ):
        row_len = 5 + len( self.meta.get_columns() )
        return 100000 / row_len

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

    def sum_values( self, base_row, leaf_row, indexes ):
        for (i, fun) in indexes:
            base_row[i] = unicode( fun(base_row[i]) + fun(leaf_row[i]) )

    def sum_columns( self, endpoint ):
        '''Update non leaves from endpoint: sum values in their number-type columns.'''
        # Get summable columns keys, id and parent will not be summed but are needed
        summable_columns = [ col['key'] for col in self.meta.get_columns()\
                                            if col['type'] == 'number' ]

        #Get values from leaves and update their parents, then their parents' parents, ...
        to_update = self.db.count_nodes( endpoint, is_leaf=False )
        print to_update
        updated = 0

        nodes = self.db.get_summed_values( summable_columns, endpoint )
        while nodes != []:
            self.db.update_nodes( endpoint, summable_columns, nodes )

            ids = [ n['parent'] for n in nodes if n['parent'] is not None ]
            nodes = self.db.get_summed_values( summable_columns, endpoint, ids )
            updated += len( ids )

            print 'Summed in %d / %d' % (updated, to_update)

        self.db.update_total( endpoint, summable_columns )

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
        self.db.remove_ptree_list_range( data_id + 1, act_data_id + 1 )

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

    def add_rows( self, id_map, common_level, hierarchy_in_row, row ):
        '''Return hierarchy rows for the given row (those that were not added
            to id map) and row without hierarchy. Update id_map object with new
            hierarchy.'''
        new_rows = []
        branch_ids = id_map.add_id( common_level, len(hierarchy_in_row) )

        hierarchy_to_add = hierarchy_in_row[common_level:]

        # TODO clear the 0/1 starting point in common_level
        for (level, col) in enumerate( hierarchy_to_add, common_level ):
            if level == len( hierarchy_in_row ) - 1:
                new_row = row
                is_leaf = True
            else:
                new_row = self.create_empty_row()
                is_leaf = False

            row_id = branch_ids[ level ]
            par_id = branch_ids[ level-1 ] if level != 0 else None
            
            db_row = self.remove_hierarchy( col, new_row, level, row_id, par_id, is_leaf )
            parsed_row = self.parse_row( db_row )
            new_rows.append( parsed_row )

        return new_rows

    def parse_row( self, row ):
        columns = self.meta.get_columns()
        parsed_row = row[:]
        
        for (i, value) in enumerate( parsed_row[5:] ):
            if columns[ i ]['type'] == 'number':
                if isinstance( value, basestring ):
                    parsed_value = re.sub( '\s', '', value )
                    parsed_row[ i + 5 ] = parsed_value

        return parsed_row

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
            row_type = u'Empty'
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
                value = '\\\N'
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

    def create_total_row( self, total_row_id ):
        '''Create total row.'''
        '''total_row = [
            total_row_id,
            None,
            trans('py_total'),
            trans('py_total_name'),
            True
        ]'''
        id_part = [
            total_row_id,
            None,
            trans('py_total'),
            trans('py_total_name'),
            True
        ]

        columns = self.meta.get_columns()
        data_part = [ '0' if col['type'] == 'number' else '' for col in columns ]
        return id_part + data_part


class IdMap:
    '''Simple class to save information about hierarchy in data in a tree-like
        structure and create IDs for data rows.'''
    def __init__( self, start_id ):
        self.ids = []
        self.act_id = start_id

    def get_root( self ):
        return self.ids

    def add_id( self, common_level, new_size ):
        '''Get to element which hierarchy is = hierarchy_list, if new hierarchy
            levels should be created, create for them also ID. Return id of the
            new element.'''
        self.ids = self.ids[:common_level]
        missing_size = new_size - common_level

        if missing_size == 0:
            self.act_id += 1
            self.ids[-1] = self.act_id
        else:
            for i in range( missing_size ):
                self.act_id += 1
                self.ids.append( self.act_id )

        return self.ids

    def get_id( self, level ):
        return self.ids[level]

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


def upload_collection( data_file, meta_file, has_header, visible ):
    '''Upload collection into db. Data should be in data_file, meta dat in meta_file.
        has_header is True if the first row in data_file is header, visible means
        that collections should be visible in the frontend.'''
    meta_freader = FileReader( meta_file )
    meta = Meta( meta_freader )

    db = DB( conf='db.conf' )

    uploader = Uploader( data_file, meta, db )
    success, endpoint = uploader.upload( has_header=has_header, visible=visible )

    return (success, endpoint)

# Taken from csv module documentation

import csv, codecs, cStringIO

class UTF8Recoder:
    """
    Iterator that reads an encoded stream and reencodes the input to UTF-8
    """
    def __init__(self, f, encoding):
        self.reader = codecs.getreader(encoding)(f)

    def __iter__(self):
        return self

    def next(self):
        return self.reader.next().encode("utf-8")

class UnicodeReader:
    """
    A CSV reader which will iterate over lines in the CSV file "f",
    which is encoded in the given encoding.
    """

    def __init__(self, f, dialect=csv.excel, encoding="utf-8", **kwds):
        f = UTF8Recoder(f, encoding)
        self.reader = csv.reader(f, dialect=dialect, **kwds)

    def next(self):
        row = self.reader.next()
        return [unicode(s, "utf-8") for s in row]

    def __iter__(self):
        return self


if __name__ == '__main__':
    '''
    There should be 3 passed arguments:
    - name of file with data
    - name of file with collection decription
    - (optional) if data file has header
    - (optional) if collection should be visible
    '''
    import sys
    args = sys.argv
    if len( args ) != 4:
        print "Wrong number of arguments. Should be at least 2 instead of ", len( args ) - 1
        exit()

    data_file = args[1]
    meta_file = args[2]
    try:
        has_header = 't' == args[3].lower()
    except IndexError:
        has_header = True
    try:
        is_visible = 't' == args[4].lower()
    except IndexError:
        is_visible = True


    upload_collection( data_file, meta_file, has_header, is_visible )

