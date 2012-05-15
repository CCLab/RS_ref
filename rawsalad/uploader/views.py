# -*- coding: utf-8 -*-
from django.http import HttpResponse
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt

from app_forms import LoginForm

import rs.sqldb as sqldb
import simplejson as json
import hashlib

import upload_helper as uh

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
    if not uh.collection_data_validated( request.POST, request.FILES ):
        return redirect( choose_collection )

    upl_file = request.FILES.get( 'file', '' )
    request.session['tmp_file'] = uh.save_upl_file( upl_file )

    labels = uh.get_header_labels( upl_file )
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

    rest_labels = uh.get_remaining_labels( hierarchy, labels )
    columns = []
    for label in rest_labels:
        columns.append({
            'label'      : label,
            'key'        : label,
            'type'       : 'string',
            'format'     : '@',
            'basic'      : True,
            'processable': True,
            'checkable'  : True
        })

    request.session['hierarchy'] = hierarchy
    return render_to_response('columns.html', {'data': columns} )

