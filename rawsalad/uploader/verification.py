#-*- coding: utf-8 -*-

from readers import FileReader as FileReader
from readers import CSVDataReceiver as CSVDataReceiver
from readers import Meta as Meta
from db import DB as DB

import re

import simplejson as json

with open( 'trans.json', 'rb' ) as trans_file:
    content = trans_file.read()
    translation = json.loads( content )

def trans( key ):
    if key not in translation:
        print 'WARNING: key %s not in translation' % key
    return translation.get( key, '???' )



def verify_data( data, columns, hierarchy_indexes, start_ind ):
    ''' Detect eventual errors in the given file (parts inconsistent with
        columns and hierarchy). Return found errors in the list.
        start_ind - index of the first row of data
    '''
    row_types = get_row_types( columns, hierarchy_indexes )
    expected_len = len( row_types )

    errors = []
    hierarchies = {}

    print 'BEFORE'
    for (i, row) in enumerate( data, start_ind ):
        if i % 1000 == 0:
            print i
        if len( row ) != expected_len:
            errors.append( bad_len( i, len(row), expected_len ) )

        if not are_fields_correct( row_types, row ):
            errors.append( bad_fields( i, row_types, row ) )

        if is_row_hierarchy_empty( row, hierarchy_indexes ):
            errors.append( empty_hierarchy( i ) )

    print 'AFTER'
    print len(errors)

    return errors


def get_row_types( columns, hierarchy_indexes ):
    ''' Return types of fields in a row '''
    size = len( columns ) + len( hierarchy_indexes )
    types = [None] * size
    columns_reversed = columns[:]
    columns_reversed.reverse()

    for nr in hierarchy_indexes:
        types[ nr ] = 'string'

    for i in range( len( types ) ):
        if types[ i ] is None:
            col = columns_reversed.pop()
            types[ i ] = col['type']

    return types


def are_fields_correct( types, row ):
    ''' Return True if any field in the row is incorrect '''
    for (i, field) in enumerate( row ):
        field_type = get_type( field )
        expected_type = types[ i ]
        if not is_field_type_sufficient( field_type, expected_type ):
            return False

    return True


def get_type( value ):
    try:
        parsed_value = re.sub( '\s', '', value )
        float( parsed_value )
        return 'number'
    except ValueError:
        return 'string'


def find_bad_fields( row, types ):
    ''' Return list with fields that have unexpected type. '''
    incorrect_fields = []

    for (i, field) in enumerate( row, 1 ):
        field_type = get_type( field )
        try:
            expected_type = types[ i - 1 ]
        except IndexError:
            # this row has too many fields
            continue

        if not is_field_type_sufficient( field_type, expected_type ):
            incorrect_fields.append( (i, field_type, expected_type) )

    return incorrect_fields


def is_field_type_sufficient( field_type, expected_type ):
    if expected_type == 'number':
        return field_type == 'number'
    elif expected_type == 'string':
        return True
    else:
        return field_type == expected_type
    

def is_row_hierarchy_empty( row, hierarchy_indexes ):
    for ind in hierarchy_indexes:
        if row[ ind ] != '':
            return False

    return True


def bad_len( row_nr, row_len, expected_len ):
    return '%s: %s %d, %s = %d, %s = %d' %\
            ( trans('py_bad_len'), trans('py_row_nr'), row_nr, 
              trans('py_len'), row_len,
              trans('py_exp_len'), expected_len )


def bad_fields( row_nr, row_types, row ):
    fields = find_bad_fields( row, row_types )

    first_part = '%s: %s %d:' %\
                (translation['py_bad_fields'], translation['py_row_nr'], row_nr)
    msg = [ first_part ]
    for (nr, ftype, expected_type) in fields:
        msg_part = '* %s: %d, %s: %s, %s: %s' %\
            (trans('py_field_nr'), nr,
             trans('py_found_type'), ftype,
             trans('py_exp_type'), expected_type)
        msg.append( msg_part )

    return '\n'.join( msg )


def empty_hierarchy( row_nr ):
    return '%s: %s: %d' % (trans('py_empty_hier'), trans('py_row_nr'), row_nr )
    

def repeated_hierarchy( row_nr, prev_nr, row_hierarchy ):
    return '%s: %s: %d, %s: %d, %s: %s' %\
            (trans('py_rep_hier'), trans('py_row_nr'), row_nr,
             trans('py_prev_row_nr'), prev_nr,
             trans('py_hier'), row_hierarchy)

