# -*- coding: utf-8 -*-
# TODO better handling of POST requests
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.shortcuts import render_to_response
import simplejson as json

import rs.dbapi as rsdb
import rs.sqldb as sqldb

# url: /
def app_page( request ):
    # TODO handle more then three browsers, FFS!
    old_browsers = [ 'MSIE 7', 'MSIE 6', 'Firefox/3' ]
    browser = request.META.get( 'HTTP_USER_AGENT', '' )

    if browser in old_browsers:
        return render_to_response( 'old_browser.html' )

    return render_to_response( 'app.html' )


# url: /get_db_tree/
def get_db_tree( req ):
    '''Get the navigation tree for all database collections'''
    # create a navigator for the db collections
    dbtree = sqldb.get_db_tree()

    return HttpResponse( json.dumps( dbtree ) )


# url: /get_init_data/
def get_init_data( req ):
    '''Get top-level data of the collection'''
    endpoint = req.GET.get( 'endpoint', None )

    collection = sqldb.Collection( endpoint )
    meta = 'to be implemented'#collection.get_metadata()

    data = {
        'data': collection.get_top_level(),
        'meta': {
            'name': collection.get_label(),
            'columns': collection.get_columns()
        }
    }

    return HttpResponse( json.dumps( data ) )


# url: /get_children/
def get_children( req ):
    '''Get children of the node'''
    endpoint = req.GET.get( 'endpoint', None )
    _id      = req.GET.get( '_id', None )

    collection = sqldb.Collection( endpoint )
    data = collection.get_children( _id )

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

    results = sqldb.search_data( user_query, endpoint )

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
    files = request.POST.get( 'csv_string' ).split( '--file--' )[:-1]

    # CSV for a single file and ZIP for multiple files
    if len( files ) == 1:
        response['Content-Type'] = 'text/csv'
        response['Content-Disposition'] = 'attachment; filename=data.csv'

        response.write( single_file( files.pop() ) )
    else:
        response['Content-Type'] = 'application/zip'
        response['Content-Disposition'] = "attachment; filename=collected_data.zip"

        response.write( multiple_files( files ) )

    return response




# url: /store_state/
# store front-end state as a permalink in mongo
# TODO can POST forms be handeled better?!
@csrf_exempt
def store_state( request ):
    data  = request.GET.get( 'state', '' )

    state_manager = rsdb.StateManager()
    permalink_id  = state_manager.save_state( json.loads( data ) )

    # TODO why the object is returned instead of simple int?
    return HttpResponse( json.dumps({ 'id': permalink_id }) )


# url: /\d+
def init_restore( request, idef ):
    '''Init application prepared to handle restore data'''
    dbtree = sqldb.get_db_tree()

    data = {
        'dbtree': json.dumps( dbtree ),
        'id': id
    }
    return render_to_response( 'app.html', data )


# url: /restore_state/
def restore_state( request ):
    '''Restore front-end state from mongo'''
    permalink_id  = request.GET.get( 'permalink_id', None )
    state_manager = rsdb.StateManager()

    groups = state_manager.get_state( int( permalink_id ) )

    return HttpResponse( json.dumps( groups ) )
