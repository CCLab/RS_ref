# -*- coding: utf-8 -*-
# TODO move imports used only in one function to this function's body
# TODO better handling of POST requests
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.core.mail import send_mail
# TODO check why django version of simplejson is in use
from django.utils import simplejson as json

import rsdbapi as rsdb


# url: /
def app_page( request ):
    # TODO handle more then three browsers, FFS!
    old_browsers = [ 'MSIE 7', 'MSIE 6', 'Firefox/3' ]
    browser = request.META.get( 'HTTP_USER_AGENT', '' )

    if browser in old_browsers:
        return render_to_response( 'old_browser.html' )

    return render_to_response( '_new_app.html' )


# url: /get_db_tree/
def get_db_tree( req ):
    '''Get the navigation tree for all database collections'''
    # create a navigator for the db collections
    db_tree = rsdb.DBNavigator().get_db_tree()

    return HttpResponse( json.dumps( db_tree ) )


# url: /get_init_data/
def get_init_data( req ):
    '''Get top-level data of the collection'''
    endpoint = int( req.GET.get( 'endpoint', None ) )

    collection = rsdb.Collection( endpoint )

    # TODO on the front-end change:
    #         :: rows --> data
    #         :: perspective --> metadata
    data = {
        'data'     : collection.get_top_level(),
        'metadata' : collection.get_metadata()
    }

    return HttpResponse( json.dumps( data ) )


# url: /get_children/
def get_children( req ):
    '''Get children of the node'''
    endpoint = int( req.GET.get( 'endpoint', None ) )
    _id      = int( req.GET.get( 'idef', None ) )

    collection = rsdb.Collection( endpoint )
    data = collection.get_children( _id )

    return HttpResponse( json.dumps( data ) )


# url: /download/
# TODO can POST forms be handeled better?!
@csrf_exempt
def download_data( request ):
    from downloader import single_file
    from downloader import multiple_files

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
    # TODO move it to session
    db    = rsdb.DBConnection().connect()
    state = rsdb.State()

    permalink_id = state.save_state( json.loads( data ), db )

    return HttpResponse( json.dumps({ 'id': permalink_id }) )


# url: /\d+
# init application prepared to handle restore data
def init_restore( request, idef ):
    data = {
        'meta': json.dumps( get_db_tree() ),
        'idef': idef
    }
    return render_to_response( 'app.html', data )


# url: /restore_state/
#restore front-end state from mongo
def restore_state( request ):
    db    = rsdb.DBConnection().connect()
    state = rsdb.State()

    permalink_id = request.GET.get( 'permalink_id', None )
    # TODO unify the parameter lists of rsdb module making db first param
    groups = state.get_state( int( permalink_id ), db )

    # TODO make it handling http errors properly!!
    if state.response['httpresp'] != 200: # ERROR!
        groups = state.response # {'descr': <str - error description>, 'httpresp': <int - http status>}
    # TODO hide db logic --> move this to db interface and give me a ready-to-use resource!!
    else:
        # now substitute list of open idefs with actual data:
        # level 'a' + open branches
        col = rsdb.Collection()
        for group in groups:
            d = int( group['dataset'] )
            v = int( group['view'] )
            i = str( group['issue'] )
            # TODO are columns complete metadata? If not -> change the name of method
            # TODO make db a first parameter of all db methods
            metadata= col.get_complete_metadata( d, v, i, db )
            group['columns']= metadata['columns']

            for sheet in group['sheets']:
                open_elements= []
                for cur_idef in sheet['rows']:
                    # artificially moving focus to one level deeper,
                    # as build_query looks for siblings, not parents
                    # TODO query should look for children not siblings!!
                    open_elements.append( "-".join( [cur_idef, '1'] ))

                # TODO move these queries into db interface FGS!!
                if sheet['filtered']:
                    find_query= { '$in': sheet['rows'] }
                else:
                    find_query= { '$regex': build_query( open_elements ) }

                col.set_query({ 'idef': find_query })
                data = col.get_data( db, d, v, i )

                # TODO make sheet['rows'], sheet['breadcrumbs'] and data be sorted the same way!!
                # TODO re-code it one sipmle for over zip( data, sheet['breeadcrumbs'] )
                if sheet['filtered']:
                    for filtered_row in data:
                        for j, rw in enumerate( sheet['rows'] ):
                            if filtered_row['idef'] == rw:
                                filtered_row.update({ 'breadcrumb': sheet['breadcrumbs'][j] })
                                break

    return HttpResponse( json.dumps( groups ) )


def search_data( request ):
    """Search engine enter point"""
    import re

    # TODO move it to session
    db  = rsdb.DBConnection().connect()
    res = rsdb.Search()

    query  = request.GET.get( 'query', '' )
    scope  = request.GET.get( 'scope', '' ).split(',')
    # TODO it's not used right now - the search always comes as strict: false
    strict = False

    # clean up multiple spaces from the query
    query  = re.sub( '\s+', ' ', query.strip() )
    result = res.search_text( db, query, scope, False )

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


def build_query( idef_list):
    """Build regex for mongo query"""
    # TODO understand why it's limited
    # TODO in long term - get rid of this limit
    results_limit = 275

    if len( idef_list ) < results_limit:
        lookup = ''.join( [ r'(%s)|' % build_idef_regexp( idef ) for idef in idef_list ] )
        # cutting the last symbol | in case it's the end of list
        lookup = lookup[:-1]

    return lookup


def build_idef_regexp( idef ):
    """Build regexp quering collection"""
    level_num = idef.count('-')

    # TODO make it recursive to be readable
    # TODO shouldn't it be done by '$or' mongo operator
    # TODO move it all to the db module!!
    # build regexp for the given idef plus it's context (siblings and full parental branch)
    if level_num > 0: # deeper than 'a'
        idef   = idef.rsplit('-', 1)[0]
        lookup = r'^%s\-[A-Z\d]+$' % idef
        level  = 1
        while level < level_num:
            idef    = idef.rsplit('-', 1)[0]
            lookup += r'|^%s\-[A-Z\d]+$' % idef
            level  += 1

        lookup += r'|^[A-Z\d]+$'
    else:
        lookup = r'^[A-Z\d]+$'

    return lookup


def do_search( scope, regex, db ):
    """
    TO-DO:
    - search with automatic substitution of specific polish letters
      (lowercase & uppercase): user can enter 'lodz', but the search
      should find 'Łódż'
    - search with flexible processing of prefixes and suffixes
      (see str.endswith and startswith)
    - search in 'info' keys
    """
    results     = []
    statistics  = { "errors": [] }
    found_count = 0

    # don't search through these fields
    excluded_fields = ['idef', 'idef_sort', 'parent', 'parent_sort', 'level']
    col = rsdb.Collection( fields=["perspective", "ns", "columns"] )

    # TODO change name of sc
    for sc in scope:
        sc_list = sc.split('-')
        d = int( sc_list[0] )
        v = int( sc_list[1] )
        i = str( sc_list[2] )

        # TODO make DB interface unified, db first!!
        # TODO is there an uncomplete version of metadata?!
        metadata = col.get_complete_metadata( d, v, i, db )
        # in case of unexisting collection - report error and try the next one
        if metadata is None:
            statistics['errors'].append( 'collection not found %s' % sc )
            continue

        current_collection = {
            'perspective' : metadata['perspective'],
            'dataset'     : d,
            'view'        : v,
            'issue'       : i,
            'data'        : []
        }

        # for search we need all fields, except for excluded_fields
        col.set_fields( None )
        for field in metadata['columns']:
            # TODO why keeping excluded_fields if there is processable field?
            if 'processable' in field:
                is_string    = field['type'] == 'string'
                not_excluded = field['key'] not in excluded_fields

                if field['processable'] and is_string and not_excluded:
                    col.set_query({ field['key']: regex })
                    # TODO make DB interface unified, db first!!
                    for found_elem in col.get_data( db, d, v, i ):
                        current_collection['data'].append({
                            'key'    : field['key'],
                            # TODO is possible that field['key'] is not string?
                            'text'   : found_elem[ str( field['key'] ) ],
                            'idef'   : found_elem['idef'],
                            'parent' : found_elem['parent']
                        })
                        found_count += 1

        if len( current_collection['data'] ) > 0:
            results.append( current_collection )

    statistics.update({ 'records_found': found_count })

    return { 'stat': statistics, 'result': results }
