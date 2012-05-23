# -*- coding: utf-8 -*-

import rs.sqldb as sqldb
import csv
import slughifi
import simplejson as json
import os
from os.path import join as osjoin
import shutil

def get_collection_data( post_data ):
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
    db_tree = sqldb.get_db_tree()
    parent_id = int( data['parents'][0] )
    siblings = filter( lambda e: e['parent'] == parent_id, db_tree )

    name = data['name'] if len( data['parents'] ) == 1 else data['parents'][1]['name']
    return name.encode('utf-8') not in [ sib['name'] for sib in siblings ]

def hierarchy_validated( hierarchy, labels ):
    if hierarchy[0]['index'] == -1:
        return False
    if len( hierarchy ) > 1 and hierarchy[-1]['index'] == -1:
        del hierarchy[-1]

    counter = [ 0 for _ in labels ]

    for level in hierarchy:
        column_ind = level['index']
        aux_ind = level['aux_index'] 
        counter[ column_ind ] -= 1
        try:
            counter[ aux_ind ] -= 1
        except:
            pass
    
    bad_indexes = filter( lambda x: x < 0, counter )
    return len( bad_indexes ) > 0

def save_upl_file( upl_file ):
    i = 0
    done = False
    while not done and i < 10:
        tmp_name = 'tmp%d.csv' % i
        try:
            tmp_file = open( tmp_name, 'w' )
            done = True
        except:
            i += 1

    if done:
        for chunk in upl_file.chunks():
            tmp_file.write( chunk )
        tmp_file.close()
        upl_file.seek( 0 )
        return tmp_name
    else:
        return None

def get_header_labels( upl_file ):
    reader = csv.reader( upl_file, quotechar='"', delimiter=';' )
    header = reader.next()
    upl_file.seek( 0 )
    utf_header = [ field.decode('utf-8') for field in header ]
    return utf_header

def get_header_labels( upl_file ):
    reader = csv.reader( upl_file, quotechar='"', delimiter=';' )
    header = reader.next()
    upl_file.seek( 0 )
    utf_header = [ field.decode('utf-8') for field in header ]
    return utf_header

def guess_types( file_name, hierarchy ):
    upl_file = open( file_name, 'rb' )
    reader = csv.reader( upl_file, quotechar='"', delimiter=';' )
    reader.next()
    first_line = reader.next()
    types = []

    for field in first_line:
        if is_int( field ):
            types.append( get_int_type_info( field ) )
        elif is_float( field ):
            types.append( get_float_type_info( field ) )
        else:
            types.append( get_string_type_info( field ) )
        print field
        print types[-1]

    upl_file.close()

    hierarchy_indexes = get_hierarchy_indexes( hierarchy )
    for i in hierarchy_indexes:
        del types[i]
    
    return types

def get_columns_descr( hierarchy, labels, types ):
    labels_copy = labels[:]
    indexes = get_hierarchy_indexes( hierarchy )
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
    if len( columns ) + len( get_hierarchy_indexes( hierarchy ) ) != len( labels ):
        return False

    for col in columns:
        if col['type'] not in ['string', 'number']:
            return False
        if (col['basic'] not in [True, False]) and (col['processable'] not in [True, False]):
            return False

    return True

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
        tmp = int( value )
    except:
        return False
    return True

def is_float( value ):
    try:
        tmp = float( value )
    except:
        return False
    return True

def is_string( value ):
    try:
        tmp = str( value )
    except:
        return False
    return True

def create_desc_file( coll_data, hier, cols, fname):
    columns = add_key( cols )
    columns = add_columns_indexes( columns, hier )
    parents = id_to_path( coll_data['parents'][0] ) + coll_data['parents'][1:]

    merged_data = {
        'name': coll_data['name'],
        'description': None,
        'label': coll_data['label'],
        'columns': columns,
        'hierarchy': hier, 
        'parents': parents
    }

    with open( fname, 'wb' ) as f:
        f.write( json.dumps( merged_data, sort_keys=True, indent=4, encoding='utf-8' ) )
    
def id_to_path( par_id ):
    if par_id is None:
        return []

    db_tree = sqldb.get_db_tree()
    id_dict = dict( zip([ n['id'] for n in db_tree ], db_tree) )

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
    hierarchy_copy = hierarchy[:]
    labels_dict = dict( zip( range( len(labels) ), labels ) )
    for level in hierarchy_copy:
        level['label'] = labels_dict[ level['index'] ]
        level['aux'] = level['aux_index'] != -1
        if level['aux_index'] != -1:
            level['aux_label'] = labels_dict[ level['aux_index'] ]

    return hierarchy_copy

def add_columns_indexes( columns, hierarchy ):
    columns_copy = columns[:]
    hierarchy_indexes = []
    for level in hierarchy:
        hierarchy_indexes.append( level['index'] )
        if level['aux_index'] != -1:
            hierarchy_indexes.append( level['aux_index'] )

    hierarchy_indexes.sort( reverse=True )
    common_size = len( hierarchy_indexes ) + len( columns )
    columns_indexes = range( common_size )

    for ind in hierarchy_indexes:
        del columns_indexes[ind]

    for (i, ind) in enumerate(columns_indexes):
        columns_copy[i]['index'] = ind

    return columns_copy

def move_src_file(filename, new_name):
    new_filename = new_name + '.csv'

    curr_path = os.getcwd()
    new_path = osjoin( osjoin( osjoin(curr_path, 'site_media'), 'csv' ), new_filename )
    print 'Copy file %s to %s' % (new_filename, new_path)
    shutil.move( filename, new_path )

def remove_files(hier_file_name, output_file_name):
    os.remove( hier_file_name )
    os.remove( output_file_name )

