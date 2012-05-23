# -*- coding: utf-8 -*-
from django.http import HttpResponse
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt

from app_forms import LoginForm

import rs.sqldb as sqldb
import simplejson as json
import hashlib

import upload_helper as uh
from upload import upload_collection

def upload( request ):
    return redirect( login )

# url: /upload/login/
def login( request ):
    login_form = LoginForm()
    return render_to_response( 'login.html', { 'form': login_form } )

# url: /upload/bad_login/
def bad_login( request ):
    login_form = LoginForm()
    info = {
        'forms': login_form,
        'ok': False,
        'warning': 'Bad login and/or password. Try again.'
    }
    return render_to_response( 'login.html', info )

# url: /upload/try_login/
@csrf_exempt
def try_login( request ):
    login = request.POST.get( 'login', '' )
    password = request.POST.get( 'password', '' )

    hash_pass = hashlib.md5( password ).hexdigest()

    if sqldb.is_user_valid( login, hash_pass ):
        request.session['logged'] = True
        request.session['user'] = login
        return redirect( choose_collection )
    else:
        request.session['logged'] = False
        return redirect( bad_login )

# url: /upload/collection/
def choose_collection( request ):
    if request.session.get( 'logged', False ) == False:
        return redirect( login )

    login = request.session['user']
    collections = sqldb.get_user_uploaded_collections( login )
    data = json.dumps( collections )
    return render_to_response('collection.html', {'collections': data} )

# url: /upload/hierarchy/
@csrf_exempt
def define_hierarchy( request ):
    collection_data = uh.get_collection_data( request.POST )
    if not uh.collection_data_validated( collection_data ):
        return redirect( choose_collection )

    request.session['collection_data'] = collection_data
    upl_file = request.FILES.get( 'file', '' )
    request.session['tmp_file'] = uh.save_upl_file( upl_file )
    labels = uh.get_header_labels( upl_file )
    upl_file.close()

    request.session['labels'] = labels
    json_labels = json.dumps( labels )
    return render_to_response('hierarchy.html', {'labels': json_labels} )

# url: /upload/columns/
@csrf_exempt
def define_columns( request ):
    hierarchy_json = request.POST.get( 'hierarchy', [] )
    hierarchy = json.loads( hierarchy_json )
    labels = request.session.get( 'labels', [] )
    if not uh.hierarchy_validated( hierarchy, labels ):
        json_labels = json.dumps( request.POST.get('labels', []) )
        return render_to_response('hierarchy.html', {'labels': json_labels} )

    full_hierarchy = uh.add_labels( hierarchy, labels )
    request.session['hierarchy'] = full_hierarchy
    types = uh.guess_types( request.session['tmp_file'], full_hierarchy )

    columns_descr = uh.get_columns_descr( full_hierarchy, labels, types )
    columns = []
    for col_descr in columns_descr:
        columns.append({
            'label'      : col_descr['label'],
            'type'       : col_descr['type'],
            'format'     : col_descr['format'],
            'basic'      : False,
            'processable': True
        })

    return render_to_response('columns.html', {'data': columns} )

# url: /upload/data/
@csrf_exempt
def upload_data( request ):
    columns_json = request.POST.get( 'columns', [] )
    columns = json.loads( columns_json )
    hierarchy = request.session.get( 'hierarchy', [] )
    labels = request.session.get( 'labels', [] )

    if not uh.columns_validated( columns, hierarchy, labels ):
        info = 'Nie ma walidacji'
        return render_to_response('results.html', {'info': info})

    coll_data = request.session['collection_data']
    data_file_name = request.session['tmp_file']
    hier_file_name = data_file_name.rstrip('.csv') + '.json'

    visible = coll_data[ 'visible' ]
    print 'VIS', visible
    uh.create_desc_file( coll_data, hierarchy, columns, hier_file_name )
    output_file_name = 'sql_' + data_file_name
    upload_collection( data_file_name, hier_file_name, output_file_name, True, visible )

    info = 'Sukces'
    return render_to_response('results.html', {'info': info})

