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
    db_tree = sqldb.DBNavigator().get_db_tree()

    return HttpResponse( json.dumps( db_tree ) )


# url: /get_init_data/
def get_init_data( req ):
    '''Get top-level data of the collection'''
    endpoint = req.GET.get( 'endpoint', None )

    collection = sqldb.Collection( endpoint )
    meta = 'to be implemented'#collection.get_metadata()

    data = {
        'data': collection.get_top_level(),
        'meta': {
            'name': 'Nazwa na sztywno',
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
    data = {
        'meta': json.dumps( get_db_tree() ),
        'idef': idef
    }
    return render_to_response( 'app.html', data )


# url: /restore_state/
def restore_state( request ):
    '''Restore front-end state from mongo'''
    permalink_id  = request.GET.get( 'permalink_id', None )
    state_manager = rsdb.StateManager()

    groups = state_manager.get_state( int( permalink_id ) )

    return HttpResponse( json.dumps( groups ) )







def search_data( request ):
    '''Search engine enter point'''
    query  = request.GET.get( 'query', None )
    scope  = request.GET.get( 'scope', None ).split(',')

    results = rsdb.Search( scope, query ).search()


    if result['result']:
        # rebuild { data: [ { idef: idef1 }, ..., { idef: idefN } ] }
        # into    { data: [ idef1, ..., idefN ] }
        # TODO why it doesn't come in a proper way? Use resources instead of data!
        for collection in result['result']:
            collection['data'] = map( lambda i: i['idef'], collection['data'] )

    return HttpResponse( json.dumps( result ))


# get initial_data + subtrees to searched nodes
def get_searched_data( req ):
    """Grabs the hit data from the first search step"""
    d   = req.GET.get( 'dataset', None )
    v   = req.GET.get( 'view', None )
    i   = req.GET.get( 'issue', None )
    ids = req.GET.get( 'ids', None ).split(',')

    find_query = build_query( ids )

    # TODO move it to session
    db = rsdb.DBConnection().connect()
    # TODO change Collection constructor to parametrized!
    # TODO move queries from views!! Make it resource-based!!
    col = rsdb.Collection( query = { 'idef': { '$regex': find_query }} )

    # TODO after making it explicit calls, fullfill the object js-style
    found_data = {}
    found_data['rows'] = col.get_data( db, d, v, i )
    # TODO change it to explicit function call!
    # TODO change parameter name from perspective to view
    found_data['perspective'] = col.metadata_complete

    return HttpResponse( json.dumps( found_data ) )

