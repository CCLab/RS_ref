# -*- coding: utf-8 -*-

import rs.sqldb as sqldb
import csv
import slughifi
import simplejson as json
import os
from os.path import join as osjoin
import shutil


with open( 'trans.json', 'rb' ) as trans_file:
    content = trans_file.read()
    translation = json.loads( content )

def trans( key ):
    if key not in trans:
        print 'WARNING: key %s not in translation' % key
    return translation.get( key, '???' )



def get_collection_data( post_data ):
    '''Get collection data from POST and return it in a dict.'''
    collection_data = {
        'name'   : post_data.get( 'name', '' ),
        'label'  : post_data.get( 'label', '' ),
        'visible': post_data.get( 'vis', '' ),
        'parents': []
    }
    collection_data['parents'] = [ int( post_data.get( 'all_colls' ) ) ]

    if post_data.get('type') == 'new':
        i = 0
        while post_data.get( 'ancestor-name-%d' % i ):
            collection_data['parents'].append({
                'name'       : post_data.get( 'ancestor-name-%d' % i ),
                'description': post_data.get( 'ancestor-desc-%d' % i ),
                'label'      : None
            })
            i += 1

    return collection_data

def collection_data_validated( data ):
    '''Check if collection with such a name and parent does not collide with
        the other potential siblings.'''
    db_tree = sqldb.get_db_tree()
    parent_id = int( data['parents'][0] )
    siblings = filter( lambda e: e['parent'] == parent_id, db_tree )

    name = data['name'] if len( data['parents'] ) == 1 else data['parents'][1]['name']

    return name.encode('utf-8') not in [ sib['name'] for sib in siblings ]

def hierarchy_validated( hierarchy, labels ):
    '''Check indexes of hierarchy fields. Checks if all indexes are smaller than
        maximal possible index and if they are not repeated.
        Index -1 in 'aux_index' means that it
        was not chosen, 'index' field = 1 should not happend.'''
    if hierarchy[0]['index'] == -1:
        return False
    # if user left last field empty, remove it
    if len( hierarchy ) > 1 and hierarchy[-1]['index'] == -1:
        del hierarchy[-1]

    # count how many times indexes appear in hierarchy
    counter = [ 0 for _ in labels ]

    for level in hierarchy:
        column_ind = level['index']
        aux_ind = level['aux_index'] 
        counter[ column_ind ] -= 1
        try:
            counter[ aux_ind ] -= 1
        except:
            # if index is beyond possible range
            pass
    
    # check if no index is repeated
    bad_indexes = filter( lambda x: x < 0, counter )
    return len( bad_indexes ) > 0

def save_upl_file( upl_file ):
    '''Save content of upl_file in a temporary file and return its name.'''
    tmp_name = 'tmp0.csv'
    tmp_file = open( tmp_name, 'w' )

    for chunk in upl_file.chunks():
        tmp_file.write( chunk )

    tmp_file.close()
    upl_file.seek( 0 )

    return tmp_name

def get_header_labels( upl_file ):
    # Get labels from the header of the uploaded file.'''
    reader = csv.reader( upl_file, quotechar='"', delimiter=';' )
    header = reader.next()
    upl_file.seek( 0 )
    utf_header = [ field.decode('utf-8') for field in header ]
    return utf_header

def guess_types( file_name, hierarchy ):
    '''Try to guess types in the data file, but omit hierarchy fields.
        Return those types in the list.'''
    upl_file = open( file_name, 'rb' )
    reader = csv.reader( upl_file, quotechar='"', delimiter=';' )
    reader.next()
    first_line = reader.next()
    types = []

    # Get types for all fields.
    for field in first_line:
        if is_int( field ):
            types.append( get_int_type_info( field ) )
        elif is_float( field ):
            types.append( get_float_type_info( field ) )
        else:
            types.append( get_string_type_info( field ) )

    upl_file.close()

    # Remove hierarchy fields from the types list.'''
    hierarchy_indexes = get_hierarchy_indexes( hierarchy )
    for i in hierarchy_indexes:
        del types[i]
    
    return types

def get_columns_descr( hierarchy, labels, types ):
    '''Get non hierarchy columns description.'''
    indexes = get_hierarchy_indexes( hierarchy )
    labels_copy = labels[:]
    # Remove labels of hierarchy columns.
    for i in indexes:
        del labels_copy[ i ]

    columns_descr = []
    for i in range( len( types ) ):
        columns_descr.append({
            'label'      : labels_copy[ i ],
            'type'       : types[ i ]['type'],
            'format'     : types[ i ]['format']
        })

    return columns_descr

def get_hierarchy_indexes( hierarchy ):
    '''Get from each hierarchy field indexes of hierarchy column and auxiliary
        column (if it exists). Return them in reversed order.'''
    indexes = []
    for level in hierarchy:
        col_ind = level['index']
        aux_ind = level['aux_index']
        if col_ind != -1:
            indexes.append( col_ind )
        if aux_ind != -1:
            indexes.append( aux_ind )

    return sorted( indexes, reverse=True )

def columns_validated( columns, hierarchy, labels ):
    '''Check if all non hierarchy columns are described in columns description
        and for each column check its attributes: type, basic and processable.'''
    if len( columns ) + len( get_hierarchy_indexes( hierarchy ) ) != len( labels ):
        return False

    for col in columns:
        if col['type'] not in ['string', 'number']:
            return False
        if (col['basic'] not in [True, False]) and (col['processable'] not in [True, False]):
            return False

    return True

def get_columns_errors( columns ):
    errors = []
    for (i, col) in enumerate( columns, 1 ):
        error = []
        if col['type'] not in ['string', 'number']:
            error.append( '%s: %s' % (trans['py_wrong_type'], col['type']) )

        if col['basic'] not in [True, False]:
            error.append( '%s: %s' % (trans['py_wrong_basic'], col['basic']) )

        if col['processable'] not in [True, False]:
            error.append( '%s: %s' % (trans['py_wrong_proc'], col['processable ']) )

        if error != []:
            error_msg = ', '.join( error )
            errors.append( '%s %d: %s' % (trans['py_column'], i, error_msg) )

    return errors

def label_to_key( label ):
    return slughifi.slughifi(label, True).replace('-', '_')

def get_int_type_info( value ):
    return {
        'type': 'number',
        'format': '# ##0'
    }

def get_float_type_info( value ):
    return {
        'type': 'number',
        'format': '# ##0'
    }

def get_string_type_info( value ):
    return {
        'type': 'string',
        'format': '@'
    }

def is_int( value ):
    try:
        int( value )
    except:
        return False
    return True

def is_float( value ):
    try:
        float( value )
    except:
        return False
    return True

def is_string( value ):
    try:
        str( value )
    except:
        return False
    return True

def create_desc_file( coll_data, hier, cols, fname):
    '''Create file describing collection with description of hierarchy, columns,
        collection's label and name and parent collections.'''
    # Fill key and index fields in columns.
    columns = add_key( cols )
    columns = add_columns_indexes( columns, hier )

    # Change direct parent's index to fields describing all antecendants.
    parents = id_to_path( coll_data['parents'][0] ) + coll_data['parents'][1:]

    merged_desc = {
        'name': coll_data['name'],
        'description': None,
        'label': coll_data['label'],
        'columns': columns,
        'hierarchy': hier, 
        'parents': parents
    }

    with open( fname, 'wb' ) as f:
        f.write( json.dumps( merged_desc, sort_keys=True, indent=4, encoding='utf-8' ) )
    
def id_to_path( par_id ):
    '''Change parent id of a node in dbtree to name, description and label
        of all antecedants. Direct parent is the last element in the list.'''
    if par_id is None:
        return []

    db_tree = sqldb.get_db_tree()
    # dict: id -> name
    id_dict = dict( zip([ n['id'] for n in db_tree ], db_tree) )

    # move to next parents to get their info until top parent is reached
    path = []
    parent_id = int( par_id )
    while True:
        parent = id_dict[ parent_id ]
        path.append({
            'name': parent['name'],
            'description': parent['description'],
            'label': None
        })
        try:
            parent_id = int( parent['parent'] )
        except:
            break

    path.reverse()

    return path

def add_key( columns ):
    columns_copy = columns[:]
    for c in columns_copy:
        c['key'] = label_to_key( c['label'] )

    return columns_copy

def add_labels( hierarchy, labels ):
    '''Add labels to hierarchy fields. Each field gets 'label', which is label
        of hierarchy column and 'aux_label' if the field has auxiliary column.'''
    hierarchy_copy = hierarchy[:]
    # dict: label_index -> label
    labels_dict = dict( zip( range( len(labels) ), labels ) )
    for level in hierarchy_copy:
        level['label'] = labels_dict[ level['index'] ]
        level['aux'] = level['aux_index'] != -1
        if level['aux_index'] != -1:
            level['aux_label'] = labels_dict[ level['aux_index'] ]

    return hierarchy_copy

def add_columns_indexes( columns, hierarchy ):
    '''Returns copy of columns with their indexes in data file added.'''
    columns_copy = columns[:]
    hierarchy_indexes = get_hierarchy_indexes( hierarchy )

    both_size = len( hierarchy_indexes ) + len( columns )
    columns_indexes = range( both_size )

    # Leave only non hierarchy columns' indexes.
    for ind in hierarchy_indexes:
        del columns_indexes[ind]

    for (i, ind) in enumerate(columns_indexes):
        columns_copy[i]['index'] = ind

    return columns_copy

def move_src_file(filename, new_name):
    '''Move file with data to directory with data files.'''
    new_filename = new_name + '.csv'

    curr_path = os.getcwd()
    new_path = osjoin( curr_path, 'site_media', 'csv', new_filename )

    print 'Copy file %s to %s' % (new_filename, new_path)
    shutil.move( filename, new_path )

def remove_files(hier_file_name, output_file_name):
    '''Remove temporary files used to upload data into db.'''
    os.remove( hier_file_name )
    os.remove( output_file_name )

