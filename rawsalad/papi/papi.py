# -*- coding: utf-8 -*-
"""
project: Raw Salad
function: public API to data and meta-data
requirements: mongod, conf file (see conf_filename)
"""

from django.http import HttpResponse
from django.utils import simplejson as json

import xml.etree.cElementTree as ET

import rsdbapi.rsdbapi as api

import rs.sqldb as sqldb


'''
xml_header = '<?xml version=\"1.0\" encoding=\"UTF-8\">'
def_version = '1.0'
formats = ['json', 'xml']
def_format = 'json'

def get_xml_header( version ):
    return "<?xml version=\"%s\" encoding=\"UTF-8\"?>" % version


def dict2et(xml_dict, root_tag='result', list_names=None):
    if not list_names:
        list_names = {}
    root = ET.Element(root_tag)
    _convert_dict_to_xml_recurse(root, xml_dict, list_names)

    return root


def _convert_dict_to_xml_recurse(parent, dict_item, list_names):
    # XML conversion
    # WARNING! can't convert bare lists

    assert not isinstance(dict_item, list)

    if isinstance(dict_item, dict):
        for (tag, child) in dict_item.iteritems():
            if isinstance(child, list):
                list_elem = ET.Element(tag)
                parent.append(list_elem)
                for listchild in child:
                    elem = ET.Element(list_names.get(tag, 'item'))
                    list_elem.append(elem)
                    _convert_dict_to_xml_recurse(elem, listchild, list_names)
            else:
                elem = ET.Element(tag)
                parent.append(elem)
                _convert_dict_to_xml_recurse(elem, child, list_names)
    elif isinstance( dict_item, basestring ):
        parent.text = dict_item.decode('utf-8')
    elif not dict_item is None:
        parent.text = unicode(dict_item)

def serialize_result( serializer, result, uri ):
    if serializer == 'json':
        ser_result = json.dumps( result, ensure_ascii=False, indent=4 )
    elif serializer == 'xml':
        header = get_xml_header( def_version )
        ser_result = header + ET.tostring( dict2et( result, root_tag='result' ) )
    else:
        raise RuntimeError( "Bad serializer" )

    return ser_result

def get_mime_type( serializer ):
    if serializer == 'json':
        return 'application/json; charset=UTF-8'
    elif serializer == 'xml':
        return 'application/xml; charset=UTF-8'
    else:
        raise RuntimeError( "Bad serializer" )
'''

def generate_response( data, request, no_query_uri=None ):
    serializer = request.GET.get( 'format', 'json' )
    if no_query_uri is None:
        base_uri = request.build_absolute_uri()
        no_query_uri = base_uri.rsplit('?', 1)[0]

    result = {
        'uri': no_query_uri,
        'data': data,
        'ns': api.create_ns_uri( no_query_uri )
    }
    #try:
    ser_result = api.serialize_result( serializer, result, no_query_uri )
    mime_type = api.get_mime_type( serializer )
    #except:
    #    return HttpResponse( status=404 )

    return HttpResponse( ser_result, mimetype=mime_type )

def get_top_api( request ):
    base_uri = request.build_absolute_uri()
    result = {
        'default_version': def_version,
        'formats': formats,
        'default_format': def_format,
        'collections_uri': base_uri + 'collections/',
        'uri': base_uri
    }

    return HttpResponse( json.dumps( result ), 'application/json; charset=UTF-8' )

def get_dbtree( request ):
    flat_tree = sqldb.get_db_tree()
    parent_id_tree = api.get_parent_id_tree( flat_tree )

    base_uri = request.build_absolute_uri()
    no_query_base_uri = base_uri.rsplit('?', 1)[0]
    data = api.get_dbtree_children( parent_id_tree, None, no_query_base_uri ),

    return generate_response( data, request, no_query_base_uri )
'''
def get_parent_id_tree( flat_tree ):
    parent_id_tree = {}
    for el in flat_tree:
        try:
            parent_id_tree[ el['parent'] ].append( el )
        except KeyError:
            parent_id_tree[ el['parent'] ] = [ el ]

    return parent_id_tree

def get_id_tree( flat_tree ):
    id_tree = {}
    for el in flat_tree:
        id_tree[ el['id'] ] = el

    return id_tree

def get_dbtree_children( tree, parent_id, base_uri ):
    act_level = tree[ parent_id ]
    children = []
    for el in act_level:
        if el['max_depth'] > 0:
            el['children'] = get_dbtree_children( tree, el['id'], base_uri )
        else:
            #el['data_uri'] = create_endpoint_uri( base_uri, el['endpoint'] )
            el['meta_uri'] = create_meta_uri( base_uri, el['endpoint'] )
            el['top_uri'] = create_top_uri( base_uri, el['endpoint'] )
        children.append( remove_empty_fields( el ) )
        
    return children

def remove_empty_fields( el ):
    el_copy = {}
    for f in el:
        if el[ f ] is not None:
            el_copy[ f ] = el[ f ]

    return el_copy

#def create_endpoint_uri( uri, endpoint ):
#    return uri + endpoint + '/tree/'
        
def create_meta_uri( uri, endpoint ):
    return uri + endpoint + '/meta/'

def create_top_uri( uri, endpoint ):
    ns_uri = create_ns_uri( uri )
    return ns_uri + '/api/collections/' + endpoint + '/'
        
def create_ns_uri( uri ):
    if uri[:4] == 'http':
        return uri[:7] + (uri[7:].split('/')[0])
    else:
        return uri.split('/')[0]

def create_search_uri( uri, endpoint ):
    return uri.replace( 'count', 'data', 1 ).replace( 'all_endpoints', endpoint, 1 )

def create_data_uri( uri, endpoint, id ):
    ns_uri = create_ns_uri( uri )
    return ns_uri + '/api/collections/%s/%s' % ( endpoint, id )

def create_children_uri( uri, endpoint, id ):
    ns_uri = create_ns_uri( uri )
    return ns_uri + '/api/collections/%s/%s/children' % ( endpoint, id )
'''

'''
def get_endpoint( request, endpoint ):
    collection = sqldb.Collection( endpoint )
    data = get_endpoint_children( collection, None )

    return generate_response( data, request )

def get_endpoint_children( collection, par_id ):
    data = []
    
    if par_id is None:
        children = collection.get_top_level()
    else:
        children = collection.get_children( par_id )

    for child in children:
        if child['leaf'] is not None:
            child['children'] = get_endpoint_children( collection, child['id'] )
        data.append( child )

    return data
'''

def get_meta( request, endpoint ):
    base_uri = request.build_absolute_uri()
    no_query_base_uri = base_uri.rsplit('?', 1)[0]

    collection = sqldb.Collection( endpoint )
    meta = {
        'columns': collection.get_columns(),
        'hierarchy': collection.get_hierarchy(),
        'label': collection.get_label(),
        'name': collection.get_name(),
        'parents': api.get_endpoint_parents( endpoint ), 
        'top_level': api.create_top_uri( no_query_base_uri, endpoint ),
        'count': len( collection.get_all_ids() )
    }

    return generate_response( meta, request )
'''
def get_endpoint_parents( endpoint ):
    flat_tree = sqldb.get_db_tree()
    id_tree = get_id_tree( flat_tree )

    endpoint_id = filter( lambda el: el['endpoint'] == endpoint, flat_tree )[0]['id']
    parents = []
    act_node = id_tree[ endpoint_id ]
    while act_node['parent'] is not None:
        act_node = id_tree[ act_node['parent'] ]
        parents.append({
            'name': act_node['name'],
            'descripition': act_node['description']
        })

    parents.reverse()
    return parents
'''

def get_data( request, endpoint, ids=[], par_id=None ):
    fields_str = request.GET.get( 'fields', '' )
    fields = fields_str.split(',')
    if fields == ['']:
        fields = []

    collection = sqldb.Collection( endpoint )
    if ids != []:
        str_ids = [str(e) for e in ids]
        rows = collection.get_nodes( str_ids )
    elif par_id is None:
        rows = collection.get_top_level()
    else:
        #rows = collection.get_nonempty_children( par_id )
        rows = collection.get_children( par_id )
    flatten_rows = [ flatten_row( row, fields, flat_row={} ) for row in rows ]

    base_uri = request.build_absolute_uri()
    no_query_base_uri = base_uri.rsplit('?', 1)[0]

    for (i, new_row) in enumerate( flatten_rows ):
        new_row['id'] = rows[i]['id']
        if not new_row['leaf']:
            new_row['children_uri'] = api.create_children_uri( no_query_base_uri, endpoint, new_row['id'] )
        if new_row['parent']:
            new_row['parent_uri'] = api.create_data_uri( no_query_base_uri, endpoint, new_row['parent'] )

    return generate_response( flatten_rows, request )

def flatten_row( row, fields=[], flat_row={} ):
    if fields == []:
        for k,v in row.iteritems():
            if isinstance( v, dict ):
                flat_row = flatten_row( v, fields, flat_row )
            else:
                flat_row[ k ] = v
    else:
        for k,v in row.iteritems():
            if isinstance( v, dict ):
                flatten_row( v, fields, flat_row )
            elif k in fields:
                flat_row[ k ] = v
                    
    return flat_row
        
def get_data_row( request, endpoint, id ):
    return get_data( request, endpoint, ids=[id] )

def get_top_level( request, endpoint ):
    return get_data( request, endpoint )

def get_children( request, endpoint, par_id ):
    return get_data( request, endpoint, par_id=par_id )

def get_search_count( request, endpoint, query ):
    if endpoint == 'all_endpoints':
        db_tree = sqldb.get_db_tree()
        endpoints = map( lambda el: el['endpoint'], db_tree )
        endpoints = filter( lambda end: end is not None, endpoints )
    else:
        endpoints = [ endpoint ]

    data = sqldb.search_count( query, endpoints )
    base_uri = request.build_absolute_uri()
    no_query_base_uri = base_uri.rsplit('?', 1)[0]
    for result in data:
        result['search_data_uri'] = create_search_uri( no_query_base_uri, result['endpoint'] )

    return generate_response( data, request, no_query_base_uri )

def get_search_data( request, endpoint, query ):
    data = sqldb.search_data( query, endpoint )

    hits_map = {}
    for box in data['boxes']:
        for row in box:
            hits_map[ row['id'] ] = row['hits']

    base_uri = request.build_absolute_uri()
    no_query_base_uri = base_uri.rsplit('?', 1)[0]

    cleaned_data = []
    for el in data['data']:
        if el['id'] in hits_map:
            cleaned_data.append({
                'id': el['id'],
                'hit_fields': hits_map[ el['id'] ],
                'uri': create_data_uri( no_query_base_uri, endpoint, el['id'] )
            })
    
    return generate_response( cleaned_data, request )

def help( request ):
    help_info = {
        'info': 'Wrong uri',
        'url_patterns': {
            'api_info': '^/$',
            'collections_info': '^collections/$',
            'collection_meta': '^collections/[a-z_0-9]+/$',
            'data_row': '^collections/[a-z_0-9]+/\d+/$',
            'top_level': '^collections/[a-z_0-9]+/$',
            'children': '^collections/[a-z_0-9]+/\d+/children/$',
            'search_count': '^collections/[a-z_0-9]+/\w+/$',
            'search_data': '^collections/[a-z_0-9]+/\w+/$',
            'help': '^.*/$'
        }
    }
    
    return generate_response( help_info, request )

