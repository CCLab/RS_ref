#-*- coding: utf-8 -*-


from urllib2 import urlopen
from csv import writer as csvwriter
import simplejson as json
import string


def data_to_csv( fname, base_url ):
    data = download( base_url )
    f = open( fname, 'wb' )
    cwriter = csvwriter( f, delimiter=';', quotechar='"' )
    for row in data:
        decoded_row = [ decode_field( field ) for field in row ]
        cwriter.writerow( decoded_row )

    f.close()
    
def download( base_url ):
    #base_url = 'http://otwartedane.pl/api/json/dataset/0/view/0/issue/2011/'
    top_data_url = base_url + 'a/'
    top_reader = urlopen( top_data_url )
    top_data = top_reader.read()#.encode( 'utf-8' )
    json_data = json.loads( top_data )
    top_data = json_data['data']

    columns_url = base_url + 'meta/'
    columns_reader = urlopen( columns_url )
    meta_data = columns_reader.read()#.encode( 'utf-8' )
    json_data = json.loads( meta_data )
    columns_data = json_data['metadata']['fields']
    modified_columns_data = modify_columns( columns_data )
    # total row has no info field, for consistency with other fields
    # info should be added if it does not exist in total
    if top_data[-1]['type'] == 'Total' and 'info' not in top_data[-1]:
        top_data[-1]['info'] = None
            
    return get_all_rows( top_data, modified_columns_data, base_url )

def modify_columns( columns ):
    leaf_col = { 'key': 'leaf' }
    info_col = { 'key': 'info' }
    id_col = {'key': 'idef' }
    par_col = {'key': 'parent' }

    return ( columns[:4] + [leaf_col, info_col, id_col, par_col] + columns[5:] )


def get_rows( top_data, ind, columns_data, base_url ):
    return get_subtree( top_data[ ind ], columns_data, base_url )
    
def get_all_rows( top_data, columns_data, base_url ):
    rows = []
    for (i, d) in enumerate( top_data ):
        rows += get_subtree( d, columns_data, base_url )
    return rows

def get_subtree( top_node, columns, base_url ):
    data = [ dicts_to_lists( [top_node], columns )[0] ]
    root_id = top_node['idef']
    if not top_node['leaf']:
        data += get_children_rec( base_url, root_id, 0, columns )

    return data

def get_children( prev_url, par_id, level, columns ):
    url = next_level_url( prev_url, par_id, level )
    print url
    ureader = urlopen( url )
    children_str = ureader.read()#.encode( 'utf-8' )
    children = json.loads( children_str )['data']
    return dicts_to_lists( children, columns )

def dicts_to_lists( rows, columns ):
    list_rows = []
    for dict_row in rows:
        list_row = []
        for col in columns:
            list_row.append( dict_row[ col['key'] ] )
        list_rows.append( list_row )

    return list_rows

def get_children_rec( prev_url, par_id, level, columns ):
    data = []
    children = get_children( prev_url, par_id, level, columns )
    leaf_ind = get_column_ind( columns, 'leaf' )
    id_ind = get_column_ind( columns, 'idef' )
    for child in children:
        data.append( child )
        if not child[ leaf_ind ]:
            url = next_level_url( prev_url, par_id, level )
            data += get_children_rec( url, child[id_ind], level + 1, columns )

    return data

def get_column_ind( columns, key ):
    for (i,col) in enumerate(columns):
        if col['key'] == key:
            return i

    raise RuntimeError( "No column with key = " + key )

def next_level_url( prev_url, par_id, level ):
    next_level = level + 1
    next_letter = string.lowercase[ next_level ]
    return ( prev_url + '%s/%s/' % ( par_id, next_letter ) )

def decode_field( field, enc='utf-8' ):
    if isinstance( field, basestring ):
        return field.encode( enc )
    else:
        return field

if __name__ == '__main__':
    fname = 'api_0_0_2011.csv'
    base_url = 'http://otwartedane.pl/api/json/dataset/0/view/0/issue/2011/'
    data_to_csv( fname, base_url )
    print 'Done'
