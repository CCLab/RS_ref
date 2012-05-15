# -*- coding: utf-8 -*-

import rs.sqldb as sqldb
import csv

def collection_data_validated( data, files ):
    db_tree = sqldb.get_db_tree()
    parent_id = int( data.get( 'all_colls', 1 ) )
    siblings = filter( lambda e: e['parent'] == parent_id, db_tree )

    if data.get( 'type', '' ) == 'old':
        name = data.get( 'name', '' )
        return name.encode('utf-8') not in [ sib['name'] for sib in siblings ]
    elif data.get( 'type', '' ) == 'new':
        name = data.get( 'ancestor-name-0', '' )
        return name.encode('utf-8') not in [ sib['name'] for sib in siblings ]
    else:
        return False

def hierarchy_validated( hierarchy, labels ):
    if hierarchy[0]['column'] == -1:
        return False
    if len( hierarchy ) > 1 and hierarchy[-1]['column'] == -1:
        del hierarchy[-1]

    counter = [ 0 for _ in labels ]

    for level in hierarchy:
        column_ind = level['column']
        aux_ind = level['aux'] 
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

def get_remaining_labels( hierarchy, labels ):
    labels_copy = labels[:]
    indexes = get_hierarchy_indexes( hierarchy )
    for i in indexes:
        del labels_copy[ i ]

    return labels_copy


def get_hierarchy_indexes( hierarchy ):
    indexes = []
    for level in hierarchy:
        col_ind = level['column']
        aux_ind = level['aux']
        if col_ind != -1:
            indexes.append( col_ind )
        if aux_ind != -1:
            indexes.append( aux_ind )

    return sorted( indexes, reverse=True )
