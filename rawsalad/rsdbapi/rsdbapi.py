from django.utils import simplejson as json
import rs.sqldb as sqldb
import xml.etree.cElementTree as ET


xml_header = '<?xml version=\"1.0\" encoding=\"UTF-8\">'
def_version = '1.0'
formats = ['json', 'xml']
def_format = 'json'

def get_xml_header( version=def_version ):
    return "<?xml version=\"%s\" encoding=\"UTF-8\"?>" % version

# XML serializer
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
        header = get_xml_header()
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

def get_top_api_info( base_uri, help_info ):
    return {
        'default_version': def_version,
        'formats': formats,
        'default_format': def_format,
        'collections_uri': base_uri + 'collections/',
        'root_uri': base_uri,
        'help': help_info
    }

def get_meta( base_uri, endpoint ):
    collection = sqldb.Collection( endpoint )
    return {
        'columns': collection.get_columns(),
        'hierarchy': collection.get_hierarchy(),
        'label': collection.get_label(),
        'name': collection.get_name(),
        'parents': get_endpoint_parents( endpoint ), 
        'top_uri': create_top_uri( base_uri, endpoint ),
        'count': len( collection.get_all_ids() )
    }

def get_parent_id_tree():
    flat_tree = sqldb.get_db_tree()
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

def get_db_tree( base_uri ):
    parent_id_tree = get_parent_id_tree()
    return get_dbtree_children( parent_id_tree, None, base_uri )

def get_data_row( uri, endpoint, fields, id ):
    return get_data( uri, endpoint, fields, ids=[id] )[0]

def get_data_top( uri, endpoint, fields ):
    return get_data( uri, endpoint, fields )

def get_data_children( uri, endpoint, fields, par_id ):
    return get_data( uri, endpoint, fields, par_id=par_id )

def get_search_count( uri, endpoint, query ):
    if endpoint == 'all_endpoints':
        db_tree = sqldb.get_db_tree()
        endpoints = [ el['endpoint'] for el in db_tree if el['endpoint'] is not None ]
    else:
        endpoints = [ endpoint ]

    data = sqldb.search_count( query, endpoints )
    for result in data:
        result['search_data_uri'] = create_search_uri( uri, result['endpoint'] )

    return data

def get_search_data( uri, endpoint, query ):
    data = sqldb.search_data( query, endpoint )

    hits_map = {}
    for box in data['boxes']:
        for row in box:
            hits_map[ row['id'] ] = row['hits']

    cleaned_data = []
    for el in data['data']:
        if el['id'] in hits_map:
            cleaned_data.append({
                'id': el['id'],
                'hit_fields': hits_map[ el['id'] ],
                'uri': create_data_uri( uri, endpoint, el['id'] )
            })

    return cleaned_data


def get_data( uri, endpoint, fields, ids=[], par_id=None ):
    collection = sqldb.Collection( endpoint )
    if ids != []:
        str_ids = [str(e) for e in ids]
        rows = collection.get_nodes( str_ids )
    elif par_id is None:
        rows = collection.get_top_level()
    else:
        rows = collection.get_nonempty_children( par_id )
    flatten_rows = [ flatten_row( row, fields, flat_row={} ) for row in rows ]

    for (i, new_row) in enumerate( flatten_rows ):
        new_row['id'] = rows[i]['id']
        if not rows[i]['leaf']:
            new_row['children_uri'] = create_children_uri( uri, endpoint, rows[i]['id'] )
        if rows[i]['parent']:
            new_row['parent_uri'] = create_data_uri( uri, endpoint, rows[i]['parent'] )

    return flatten_rows


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
        

def get_dbtree_children( tree, parent_id, base_uri ):
    act_level = tree[ parent_id ]
    children = []
    for el in act_level:
        if el['max_depth'] > 0:
            el['children'] = get_dbtree_children( tree, el['id'], base_uri )
        else:
            el['meta_uri'] = create_meta_uri( base_uri, el['endpoint'] )
            el['top_uri'] = create_top_uri( base_uri, el['endpoint'] )
        children.append( remove_empty_fields( el ) )
        
    return children

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


def remove_empty_fields( el ):
    el_copy = {}
    for f in el:
        if el[ f ] is not None:
            el_copy[ f ] = el[ f ]

    return el_copy

# URI generating functions

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


