# -*- coding: utf-8 -*-
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt

import simplejson as json
import hashlib

import rs.sqldb as sqldb
import upload_helper as uh
from upload import upload_collection


with open( 'trans.json', 'rb' ) as trans_file:
    content = trans_file.read()
    translation = json.loads( content )

def trans( key ):
    if key not in trans:
        print 'WARNING: key %s not in translation' % key
    return translation.get( key, '???' )



def upload( request ):
    return redirect( login )

# url: /upload/login/
def login( request ):
    return render_to_response( 'login.html' )

# url: /upload/bad_login/
def bad_login( request ):
    info = {
        'ok': False,
        'warning': trans['py_bad_login']
    }
    return render_to_response( 'login.html', info )

# url: /upload/try_login/
@csrf_exempt
def try_login( request ):
    login_data_json = request.POST.get( 'login_data', [] )
    login_data = json.loads( login_data_json )
    login = login_data['user']
    password = login_data['password']

    hash_pass = hashlib.md5( password ).hexdigest()

    if sqldb.is_user_valid( login, hash_pass ):
        request.session['logged'] = True
        request.session['user'] = login
        return redirect( choose_collection )
    else:
        request.session['logged'] = False
        return redirect( bad_login )

# url: /upload/create_user/
@csrf_exempt
def create_user( request ):
    if request.session.get( 'logged', False ) == False or \
       request.session.get( 'user', '' ) != 'admin':
        return redirect( login )

    return render_to_response( 'create.html' )


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

    if not uh.columns_validated( columns, hierarchy, labels ):
        errors = uh.get_columns_errors( columns )
        msg = {
            'header': trans['py_col_errors'],
            'errors': errors
        }
        errors_json = json.dumps( errors )
        return render_to_response( 'results.html', {'info': errors_json} )

    coll_data = request.session['collection_data']
    data_file_name = request.session['tmp_file']
    hier_file_name = data_file_name.rstrip('.csv') + '.json'

    # create meta file describing data
    uh.create_desc_file( coll_data, hierarchy, columns, hier_file_name )

    # upload data into db
    visible = coll_data[ 'visible' ]
    output_file_name = 'sql_' + data_file_name
    done, result = upload_collection( data_file_name, hier_file_name, output_file_name, True, visible )

    # remove temporary files
    try:
        uh.remove_files( hier_file_name, output_file_name )
    except OSError:
        # there were errors in data -> not all files were created
        pass

    if done:
        # move file with data to special directory
        uh.move_src_file( data_file_name, result )
        info = {
            'header': trans['py_success']
        }
    else:
        info = {
            'header': trans['py_errors'],
            'errors': result
        }

    info_json = json.dumps( info )
    return render_to_response('results.html', {'info': info_json})

