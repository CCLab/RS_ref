# -*- coding: utf-8 -*-
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt

from app_forms import LoginForm

import simplejson as json
import hashlib

import rs.sqldb as sqldb
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
        'form': login_form,
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
    '''Save info about collection (if valid) and return columns' names so
        that the user is able to choose hierarchy columns.'''
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
    '''Save hierarchy description (if valid) and return columns labels
        with fields describing them. Try to guess types of values in those
        columns basing on the first data line.'''
    hierarchy_json = request.POST.get( 'hierarchy', [] )
    hierarchy = json.loads( hierarchy_json )
    labels = request.session.get( 'labels', [] )

    if not uh.hierarchy_validated( hierarchy, labels ):
        json_labels = json.dumps( request.POST.get('labels', []) )
        return render_to_response('hierarchy.html', {'labels': json_labels} )

    # hierarchy fields are defined by their positions and we need also to get
    # their labels
    full_hierarchy = uh.add_labels( hierarchy, labels )
    request.session['hierarchy'] = full_hierarchy

    types = uh.guess_types( request.session['tmp_file'], full_hierarchy )

    # get description of columns not chosen in hierarchy
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
    '''Check if non hierarchy columns description is valid. If yes then create
        file describing collection, columns and hierarchy and upload data into
        the db using that file and file with data. After that, move file with
        data to separate directory and remove temporary files.'''
    columns_json = request.POST.get( 'columns', [] )
    columns = json.loads( columns_json )
    hierarchy = request.session.get( 'hierarchy', [] )
    labels = request.session.get( 'labels', [] )
    print 'JSON', columns_json

    if not uh.columns_validated( columns, hierarchy, labels ):
        info = 'Kolumny niepoprawne'
        return render_to_response('results.html', {'info': info})

    coll_data = request.session['collection_data']
    data_file_name = request.session['tmp_file']
    hier_file_name = data_file_name.rstrip('.csv') + '.json'


    # create meta file describing data
    uh.create_desc_file( coll_data, hierarchy, columns, hier_file_name )

    # upload data into db
    visible = coll_data[ 'visible' ]
    output_file_name = 'sql_' + data_file_name
    done, endpoint = upload_collection( data_file_name, hier_file_name, output_file_name, True, visible )

    # remove temporary files and move file with data to special directory
    uh.remove_files(hier_file_name, output_file_name)
    if done:
        uh.move_src_file(data_file_name, endpoint)
        info = 'Sukces'
    else:
        info = 'Porażka'

    return render_to_response('results.html', {'info': info})

