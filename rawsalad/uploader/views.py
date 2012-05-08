# -*- coding: utf-8 -*-
from django.http import HttpResponse
from django.shortcuts import render_to_response, redirect
from django.views.decorators.csrf import csrf_exempt

from app_forms import LoginForm
import rs.sqldb as sqldb

import hashlib

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
        print 'a'
        request.session['logged'] = True
        print 'b'
        return redirect( choose_collection )
    else:
        request.session['logged'] = False
        return redirect( bad_login )

# url: /upload/collection/
def choose_collection( request ):
    print 'c'
    if request.session.get( 'logged', False ) == False:
        return redirect( login )

    return render_to_response('collection.html')

