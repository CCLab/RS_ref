# -*- coding: utf-8 -*-
# TODO move imports used only in one function to this function's body
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import Context, loader
from django.utils import simplejson as json
from django.core.mail import send_mail

import rsdbapi as rsdb
import re
from time import time

from operator import attrgetter


# url: /
def app_page( request ):
    # TODO handle more then three browsers, FFS!
    old_browser_marks = [ 'MSIE 7', 'MSIE 6', 'Firefox/3' ]
    browser = request.META.get( 'HTTP_USER_AGENT', '' )

    if len( [x for x in old_browser_marks if x in browser] ) > 0:
        return render_to_response( 'old_browser.html' )

    return render_to_response( 'app.html', { 'meta': get_meta_tree() })


# get the metadata tree (i.e. all datasets, views, issues)
def get_meta_tree():
    # sort comparator
    def dataset_compare( d1, d2 ):
        return d1['idef'] - d2['idef']

    # TODO can we store the connection in the session?
    # TODO can we use some kind of singleton pattern here?!
    # TODO make it explicit function call instead of field retrieval
    db  = rsdb.DBconnect( "mongodb" ).dbconnect
    nav = rsdb.Navtree()

    # get metadata tree and sort it by dataset idef
    meta_tree = nav.get_meta_tree( db )
    meta_tree.sort( cmp=dataset_compare )

    return json.dumps( meta_tree )


# url: /get_init_data/
# get top-level data of the collection
def get_init_data( req ):
    d = req.GET.get( 'dataset', None )
    v = req.GET.get( 'view', None )
    i = req.GET.get( 'issue', None )

    # TODO in the session?
    db  = rsdb.DBconnect("mongodb").dbconnect
    # TODO change Collection constructor to parametrized!
    # TODO move queries from views!! Make it resource-based!!
    col = rsdb.Collection( query={ 'level': 'a' } )

    data = {}
    data['rows'] = col.get_data( db, d, v, i )
    # TODO change it to explicit function call!
    # TODO change parameter name from perspective to view
    data['perspective']= col.metadata_complete

    return HttpResponse( json.dumps( data ) )


# url: /get_children/
# get children of the node
def get_children( req ):
    d = req.GET.get( 'dataset', None )
    v = req.GET.get( 'view', None )
    i = req.GET.get( 'issue', None )
    idef = req.GET.get( 'idef', None )

    # TODO session!!
    db  = rsdb.DBconnect("mongodb").dbconnect
    # TODO constructor
    # TODO move queries out
    col = rsdb.Collection( query = { 'parent': idef })

    data = col.get_data( db, d, v, i )

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
    db    = rsdb.DBconnect("mongodb").dbconnect
    state = rsdb.State()

    permalink_id = state.save_state( json.loads( data ), db )

    return HttpResponse( json.dumps({ 'id': permalink_id }) )


# url: /\d+
# init application prepared to handle restore data
def init_restore( request, idef ):
    data = {
        'meta': get_meta_tree(),
        'idef': idef
    }
    return render_to_response( 'app.html', data )


# url: /restore_state/
#restore front-end state from mongo
def restore_state( request ):
    db    = rsdb.DBconnect("mongodb").dbconnect
    state = rsdb.State()

    permalink_id = request.GET.get( 'permalink_id', None )
    # TODO unify the parameter lists of rsdb module making db first param
    groups = state.get_state( int( permalink_id ), db )

    # TODO make it handling http errors properly!!
    if state.response['httpresp'] != 200: # ERROR!
        groups= state.response # {'descr': <str - error description>, 'httpresp': <int - http status>}
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

###########################################################################




def build_regexp(searchline, strictsearch):
    """ construct regexp for search """
    # building regexp for search
    if strictsearch:
        # ver 0.0
        # searchline= "^%(lookupstr)s\s|\s%(lookupstr)s\s|\s%(lookupstr)s$" % { "lookupstr": searchline }
        # ver 0.1
        searchline= "^%(lookupstr)s([^a-z][^A-Z][^0-9]|\s)|([^a-z][^A-Z][^0-9]|\s)%(lookupstr)s([^a-z][^A-Z][^0-9]|\s)|([^a-z][^A-Z][^0-9]|\s)%(lookupstr)s$" % { "lookupstr": searchline }

    return searchline

def do_search(scope_list, regx, dbconn):
    """
    TO-DO:
    - search with automatic substitution of specific polish letters
      (lowercase & uppercase): user can enter 'lodz', but the search
      should find 'Łódż'
    - search with flexible processing of prefixes and suffixes
      (see str.endswith and startswith)
    - search in 'info' keys
    """
    ns_list= [] # list of results
    stat_dict= { "errors": [] }
    found_num= 0 # number of records found
    exclude_fields= ['idef', 'idef_sort', 'parent', 'parent_sort', 'level'] # not all fields are searchable

    for sc in scope_list: # fill the list of collections
        sc_list= sc.split('-')
        dataset, idef, issue= int(sc_list[0]), int(sc_list[1]), str(sc_list[2])
        coll= rsdb.Collection(fields=["perspective", "ns", "columns"])
        metadata= coll.get_complete_metadata(dataset, idef, issue, dbconn)
        if metadata is None:
            stat_dict['errors'].append('collection not found %s' % sc)
        else:
            curr_coll_dict= {
                'perspective': metadata['perspective'],
                'dataset': dataset,
                'view': idef,
                'issue': issue,
                'data': []
                }


            coll.set_fields(None) # for search we need all fields, except for exclude_fields
            for fld in metadata['columns']:
                if 'processable' in fld:
                    check_str= fld['type'] == 'string'
                    check_excl= fld['key'] not in exclude_fields
                    if fld['processable'] and check_str and check_excl:
                        search_query= { fld['key']: regx }
                        coll.set_query(search_query)
                        found= coll.get_data(dbconn, dataset, idef, issue)
                        if len(found) > 0:
                            for found_elt in found:
                                curr_coll_dict['data'].append({
                                    'key': fld['key'],
                                    'text': found_elt[str(fld['key'])],
                                    'idef': found_elt['idef'],
                                    'parent': found_elt['parent']
                                    })
                                found_num += 1
            if len(curr_coll_dict['data']) > 0:
                ns_list.append(curr_coll_dict)

    stat_dict.update( { 'records_found': found_num } )

    return { 'stat': stat_dict, 'result': ns_list }

def search_data( request ):
    """
    search engine enter point
    """
    usrqry = request.GET.get( 'query', '' )
    scope = request.GET.get( 'scope', '' )
    strict = request.GET.get( 'strict', 'false' )
    # converting scope and strict to objects
    scope_list= scope.split(',')
    if strict == 'false':
        strict= False
    else:
        strict= True

    usrqry= usrqry.strip() # cleaning user query
    query_str= re.sub('\s+', ' ', usrqry) # cleaning multiple spaces

    db= rsdb.DBconnect('mongodb').dbconnect
    res= rsdb.Search()

    # WARNING!
    # rsdb.Search().search_data(...) - old way of search (through text keys)
    # rsdb.Search().search_text(...) - new way of search (through _keywords)

    # result= res.search_data( db, qrystr= query_str, scope= scope_list, strict= strict )
    fld_list= ['idef'] # on the first stage return only idefs
    result= res.search_text( db, qrystr= query_str, scope= scope_list, display= fld_list, strict= strict )
    if len(result['result']) > 0:

        # rebuild { data: [ { idef: idef1 }, ..., { idef: idefN } ] }
        # into { data: [ idef1, ..., idefN ] }
        for res_persp in result['result']:
            new_data= []
            for doc in res_persp['data']:
                new_data.append(doc['idef'])
            res_persp['data']= new_data

    return HttpResponse( json.dumps( result ))

def string2list( in_str ):
    """ converts comma separated string to the list """
    out_list= []
    try:
        for elm in in_str.split(','):
            if '[' in elm:
                elm= elm.replace('[', '')
            if ']' in elm:
                elm= elm.replace(']', '')
            out_list.append( elm.strip().encode('utf-8') )
    except:
        pass

    return out_list

def build_idef_regexp( curr_idef ):
    """ build regexp quering collection """
    level_num= curr_idef.count('-')

    # build regexp for the given idef plus it's context (siblings and full parental branch)
    if level_num > 0: # deeper than 'a'
        idef_srch= curr_idef.rsplit('-', 1)[0]
        lookup_idef= r'^%s\-([A-Z]|\d)+$' % idef_srch
        curr_idef= idef_srch
        level= 1
        while level < level_num:
            idef_srch= curr_idef.rsplit('-', 1)[0]
            lookup_idef += r'|^%s\-([A-Z]|\d)+$' % idef_srch
            curr_idef= idef_srch
            level += 1
        lookup_idef += r'|^([A-Z]|\d)+$'

    else: # simply query the highest level
        lookup_idef= r'^([A-Z]|\d)+$'

    return lookup_idef

def build_query( idef_list):
    lookup, i= '', 0

    result_limit= 275 # WARNING! Limiting number of idefs here with a constant
    if len(idef_list) > result_limit:
        idef_list= idef_list[:result_limit]

    if len(idef_list) > 0:
        for idef in idef_list:
            i += 1

            lookup_idef= build_idef_regexp( idef )

            lookup += r'(%s)|' % lookup_idef
            if i == len(idef_list):
                lookup= lookup[:-1] # cutting the last symbol | in case it's the end of list

    else: # in cases there're no 'open' nodes in the view
        lookup= build_idef_regexp( '0' ) # this returns regexp for getting level 'a' only

    return lookup


# get initial_data + subtrees to searched nodes
def get_searched_data( request ):
    response_dict = {
        'dataset': int( request.GET.get( 'dataset', -1 ) ),
        'view': int( request.GET.get( 'view', -1 ) ),
        'issue': request.GET.get( 'issue', '' ).encode('utf-8'),
        'idef': string2list( request.GET.get( 'idef', '' ) ),
        'regexp': True
    }

    find_query= build_query( response_dict['idef'] )

    db= rsdb.DBconnect("mongodb").dbconnect
    coll= rsdb.Collection(query= { 'idef': { '$regex': find_query} })

    return_data = {}
    return_data['rows']= coll.get_data(
        db, response_dict['dataset'], response_dict['view'], response_dict['issue']
        )

    return_data['perspective']= coll.metadata_complete

    return HttpResponse( json.dumps(return_data) )

