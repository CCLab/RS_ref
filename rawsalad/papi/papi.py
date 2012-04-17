# -*- coding: utf-8 -*-
"""
project: Raw Salad
function: public API to data and meta-data
requirements: mongod, conf file (see conf_filename)
"""

from django.http import HttpResponse
from django.utils import simplejson as json

import xml.etree.cElementTree as ET

from ConfigParser import ConfigParser
import re

import rsdbapi as rsdb

import rs.sqldb as sqldb
#from xml_serializer import Py2XML as py2xml


conf_filename= "/home/cecyf/www/projects/rawsalad/src/rawsalad/site_media/media/rawsdata.conf"

xml_header = '<?xml version=\"1.0\" encoding=\"UTF-8\">'
def_version = '1.0'
formats = ['json', 'xml']
def_format = 'json'

level_list= ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']

def get_header( version ):
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


def format_result(result, srz, httpresp= None, rt_tag= None):
    if httpresp is None:
        httpresp= 200
    if srz == 'json':
        res= json.dumps( result, ensure_ascii=False, indent=4 )
        mime_tp= "application/json"
    elif srz == 'xml':
        # if rt_tag is None: # if root tag is not given, use 'request' key as a root tag
        #     rt_tag= result.pop('request') # ehh.. i liked this idea very much
        rt_tag= 'result'
        res_raw= ET.tostring(dict2et(result, root_tag=rt_tag))
        res= "".join([ xml_header, res_raw ])
        mime_tp= "application/xml"
    else: # error: format missing (like ../api/dataset/ instead of /api/<format>/dataset/)
        format_error= rsdb.Response().get_response(35)
        res= json.dumps( {
            "response": format_error["descr"],
            "request": srz
            }, ensure_ascii=False, indent=4 )
        mime_tp= "application/json"
        httpresp= format_error["httpresp"]
    return res, mime_tp, httpresp


def path2query(path_str):
    out_query= {}

    if len(path_str) != 0:
        path_list= path_str.rsplit('/')
        last_elt= path_list[len(path_list)-1]
        if last_elt in level_list: # last element is a sign of level
            if path_list[len(path_list)-1] == 'a': # level 'a' has no parents
                out_query['level']= path_list[len(path_list)-1]
            else:
                out_query['parent']= path_list[len(path_list)-2] # the one before last is a parent
        else:
            out_query['idef']= path_list[len(path_list)-1] # the last elt is current idef
    return out_query

def get_formats(request):
    result= {'formats': ['json', 'xml']}
    result['uri']= request.build_absolute_uri()
    return HttpResponse( json.dumps( result ), 'application/json' )


def serialize_result( serializer, result, uri ):
    if serializer == 'json':
        ser_result = json.dumps( result, ensure_ascii=False, indent=4 )
    elif serializer == 'xml':
        header = get_header( def_version )
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

def generate_response( data, request, no_query_uri=None ):
    serializer = request.GET.get( 'format', 'json' )
    if no_query_uri is None:
        base_uri = request.build_absolute_uri()
        no_query_uri = base_uri.rsplit('?', 1)[0]

    result = {
        'uri': no_query_uri,
        'data': data,
        'ns': create_ns_uri( no_query_uri )
    }
    try:
        ser_result = serialize_result( serializer, result, no_query_uri )
        mime_type = get_mime_type( serializer )
    except:
        return HttpResponse( status=404 )

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
    parent_id_tree = get_parent_id_tree( flat_tree )

    base_uri = request.build_absolute_uri()
    no_query_base_uri = base_uri.rsplit('?', 1)[0]
    data = get_dbtree_children( parent_id_tree, None, no_query_base_uri ),

    return generate_response( data, request, no_query_base_uri )

def get_parent_id_tree( flat_tree ):
    parent_id_tree = {}
    for el in flat_tree:
        try:
            parent_id_tree[ el['parent'] ].append( el )
        except KeyError:
            parent_id_tree[ el['parent'] ] = [ el ]

    return parent_id_tree

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
    return uri + endpoint + '/'
        
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
    collection = sqldb.Collection( endpoint )
    meta = {
        'columns': collection.get_columns(),
        'hierarchy': collection.get_hierarchy(),
        'label': collection.get_label(),
        'count': len( collection.get_all_ids() )
    }

    return generate_response( meta, request )

def get_data( request, endpoint, id ):
    fields_str = request.GET.get( 'fields', '' )
    fields = fields_str.split(',')
    if fields == ['']:
        fields = []

    collection = sqldb.Collection( endpoint )
    row = collection.get_nodes( int(id) )[0]
    cleaned_row = flatten_row( row, fields )
    cleaned_row['id'] = row['id']

    return generate_response( cleaned_row, request )

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
        

def get_top_level( request, endpoint ):
    return get_children( request, endpoint, None )

def get_children( request, endpoint, par_id ):
    collection = sqldb.Collection( endpoint )
    if par_id is None:
        data = collection.get_top_level()
    else:
        data = collection.get_children( par_id )

    return generate_response( data, request )

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
            'collections_info': '^collections/$'
        }
    }
    
    return generate_response( help_info, request )


