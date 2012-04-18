#from django.http import HttpResponse
from django.utils import simplejson as json
import xml.etree.cElementTree as ET

import rs.sqldb as sqldb

xml_header = '<?xml version=\"1.0\" encoding=\"UTF-8\">'
def_version = '1.0'
formats = ['json', 'xml']
def_format = 'json'

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


