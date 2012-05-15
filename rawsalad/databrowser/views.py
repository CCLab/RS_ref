# -*- coding: utf-8 -*-
# TODO better handling of POST requests
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.shortcuts import render_to_response
import simplejson as json

import rs.sqldb as sqldb

# url: /
def app_page( request ):
    # TODO handle more then three browsers, FFS!
    old_browsers = [ 'MSIE 7', 'MSIE 6', 'Firefox/3' ]
    browser = request.META.get( 'HTTP_USER_AGENT', '' )

    if browser in old_browsers:
        return render_to_response( 'old_browser.html' )

    return render_to_response( 'app.html' )


# url: /get_collections/
def get_collections( req ):
    '''Get the navigation tree for all database collections'''
    # create a navigator for the db collections
    format = req.GET.get( 'format', 'list' )
    collections = []
    if format == 'list':
        collections = sqldb.get_db_tree()
    else:
        raise Exception('Bad format type')

    return HttpResponse( json.dumps( collections ) )


# url: /get_init_data/
def get_init_data( req ):
    '''Get top-level data of the collection'''
    endpoint = req.GET.get( 'endpoint', None )

    collection = sqldb.Collection( endpoint )
    data = {
        'data': collection.get_top_level(),
        'meta': {
            'label'  : collection.get_label(),
            'columns': collection.get_columns()
        }
    }

    return HttpResponse( json.dumps( data ) )


# url: /get_children/
def get_children( req ):
    '''Get children of the node'''
    endpoint  = req.GET.get( 'endpoint', None )
    parent_id = req.GET.get( 'parent_id', None )

    collection = sqldb.Collection( endpoint )
    if endpoint != parent_id:
        data = collection.get_nonempty_children( parent_id )
    else:
        data = collection.get_top_level()

    return HttpResponse( json.dumps( data ) )



# url /search_count/
def search_count( req ):
    user_query = req.GET.get( 'user_query', None )
    scope      = json.loads( req.GET.get( 'scope', 'null' ) )

    results = sqldb.search_count( user_query, scope )

    return HttpResponse( json.dumps( results ))


# url /search_data/
def search_data( req ):
    user_query = req.GET.get( 'user_query', None )
    endpoint   = req.GET.get( 'endpoint', None )
    get_meta   = req.GET.get( 'get_meta', False )

    results = sqldb.search_data( user_query, endpoint, get_meta )

    return HttpResponse( json.dumps( results ))


# TODO can POST forms be handeled better?!
@csrf_exempt
def feedback_email( request ):
    from django.core.mail import send_mail
    e_from    = request.POST.get( 'email', 'NO EMAIL PROVIDED' )
    e_message = request.POST.get( 'message', 'MESSAGE LEFT EMPTY' )

    send_mail( 'Raw Salad Feedback',
                e_message,
                e_from,
                ['ktrzewiczek@centrumcyfrowe.pl'] )

    return HttpResponse( 'Email sent' )



# ------------------------------------------------------------------

# url: /download/
# TODO can POST forms be handeled better?!
@csrf_exempt
def download_data( request ):
    from rs.downloader import single_file
    from rs.downloader import multiple_files

    response = HttpResponse()
    # TODO check if this is the only way to create a sheets download!
    files = json.loads( request.POST.get( 'csv_string', '' ) )

    # CSV for a single file and ZIP for multiple files
    if len( files ) == 1:
        response['Content-Type'] = 'text/csv'
        response['Content-Disposition'] = 'attachment; filename=data.csv'

        response.write( single_file( files.pop() ) )
    else:
        response['Content-Type'] = 'application/zip'
        response['Content-Disposition'] = 'attachment; filename=collected_data.zip'

        response.write( multiple_files( files ) )

    return response


# url: /store_state/
# TODO can POST forms be handeled better?!
@csrf_exempt
def store_state( request ):
    data  = request.POST.get( 'state', '' )

    permalink_id = sqldb.save_permalink( json.loads( data ) )

    return HttpResponse( permalink_id )


# url: /\d+
def init_restore( request, id ):
    '''Init application prepared to handle restore data'''
    dbtree = sqldb.get_db_tree()

    data = {
        'dbtree': dbtree,
        'id': id,
        'endpoints': sqldb.get_permalink_endpoints( id )
    }

    return  render_to_response( 'app.html', data )


# url: /restore_state/
def restore_state( request ):
    '''Restore front-end state from mongo'''
    permalink_id  = request.GET.get( 'permalink_id', None )
    endpoint      = request.GET.get( 'endpoint', None )

    group = sqldb.restore_group( permalink_id, endpoint )

    return HttpResponse( json.dumps( group ) )
