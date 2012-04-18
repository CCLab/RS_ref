# -*- coding: utf-8 -*-
"""
project: Raw Salad
function: public API to data and meta-data
requirements: mongod, conf file (see conf_filename)
"""

from django.http import HttpResponse
import rsdbapi.rsdbapi as api

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
    try:
        ser_result = api.serialize_result( serializer, result, no_query_uri )
        mime_type = api.get_mime_type( serializer )
    except:
        return HttpResponse( status=404 )

    return HttpResponse( ser_result, mimetype=mime_type )

def get_top_info( request ):
    uri = clean_uri( request )
    help_info = generate_help()
    result = api.get_top_api_info( uri, help_info )

    return generate_response( result, request, uri )

def get_dbtree( request ):
    uri = clean_uri( request )
    data = api.get_db_tree( uri )

    return generate_response( data, request, uri )

def get_meta( request, endpoint ):
    uri = clean_uri( request )
    meta = api.get_meta( uri, endpoint )

    return generate_response( meta, request, uri )

def get_data_row( request, endpoint, id ):
    fields = get_data_fields( request )
    uri = clean_uri( request )
    data = api.get_data_row( uri, endpoint, fields, id )

    return generate_response( data, request, uri )

def get_top_level( request, endpoint ):
    fields = get_data_fields( request )
    uri = clean_uri( request )
    data = api.get_data_top( uri, endpoint, fields )

    return generate_response( data, request, uri )

def get_children( request, endpoint, par_id ):
    fields = get_data_fields( request )
    uri = clean_uri( request )
    data = api.get_data_children( uri, endpoint, fields, par_id )

    return generate_response( data, request, uri )

def get_search_count( request, endpoint, query ):
    uri = clean_uri( request )
    data = api.get_search_count( uri, endpoint, query )

    return generate_response( data, request, uri )

def get_search_data( request, endpoint, query ):
    uri = clean_uri( request )
    data = api.get_search_data( uri, endpoint, query )

    return generate_response( data, request, uri )

def get_help( request ):
    help_info = generate_help()
    help_info['info'] = 'Wrong uri'
    return generate_response( help_info, request )


def generate_help():
    return {
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

def clean_uri( request ):
    base_uri = request.build_absolute_uri()
    return base_uri.rsplit('?', 1)[0]
    
def get_data_fields( request ):
    fields_str = request.GET.get( 'fields', '' )
    fields = fields_str.split(',')
    return fields if fields != [''] else []
    
