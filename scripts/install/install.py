#!/usr/bin/env python

import os
from string import Template

from getpass import getpass
import hashlib
import psycopg2 as psql
import subprocess
import minify

def create_and_init_tables():
    print 'Tables initialization'
    user_name = raw_input('Database user name:')

    command = 'psql --user %s --file init_db.sql' % user_name
    subprocess.call( command )

def create_db_configuration():
    user_values = {}

    print 'DB configuration file creation'
    user_values['host'] = raw_input('Host: ')
    user_values['dbname'] = raw_input('Database name: ')
    user_values['user'] = raw_input('User name: ')
    user_values['pass'] = raw_input('Password: ')

    print 'Creating the new file from template'
    temp_file_path = os.path.join( 'config_templates', 'db_template.conf' )
    with open( temp_file_path, 'r' ) as temp_file:
        temp_content = temp_file.read()

    template = Template( temp_content )
    content = template.substitute( user_values )

    root_dir_path = os.path.dirname( os.path.dirname( os.getcwd() ) )
    db_file_paths = [ os.path.join( root_dir_path, 'rawsalad', 'db.conf' ),
                      os.path.join( root_dir_path, 'rawsalad', 'rs', 'rawsdata.conf' ) ]

    for file_name in db_file_paths:
        with open( file_name, 'wb' ) as db_file:
            db_file.write( content )

    print 'Success'

    return user_values

def create_settings_configuration():
    user_values = {}

    print 'Settings configuration file creation'
    admins_count = int( raw_input('How many admins do you want to have?' ) )
    admins = []
    admins_str = ''
    for i in range( admins_count ):
        name = raw_input("Admin's name: ")
        email = raw_input("Admin's email address: ")
        if i != 0:
            admins_str += '\n    '

        admins_str += str( (name, email) ) + ','

    user_values['admins'] = admins_str # without '[' and ']'

    user_values['time_zone'] = raw_input('Time zone: ')
    user_values['language_code'] = raw_input('Language code: ')
    user_values['media_dir'] = raw_input('Directory with media files (e.g. site_media ): ')
    user_values['host_addr'] = raw_input('Host address and port for RawSalad on your machine(ip:port) : ')
    user_values['secret_key'] = generate_secret_key()
                                            

    print 'Creating the new file from template'
    temp_file_path = os.path.join( 'config_templates', 'settings_template.py' )
    with open( temp_file_path, 'r' ) as temp_file:
        temp_content = temp_file.read()

    template = Template( temp_content )
    content = template.substitute( user_values )

    root_dir_path = os.path.dirname( os.path.dirname( os.getcwd() ) )
    settings_file_path = os.path.join( root_dir_path, 'rawsalad', 'settings.py' )

    with open( settings_file_path, 'wb' ) as settings_file:
        settings_file.write( content )

    print 'Success'

def create_admin_user( conf_values ):
    cursor = db_cursor( conf_values )

    admin_pass = get_pass('Admin password:')
    admin_pass_repeat = get_pass('Repeat admin password:')

    while admin_pass != admin_pass_repeat:
        print 'Passwords are not the same! Repeat'
        admin_pass = get_pass('Admin password:')
        admin_pass_repeat = get_pass('Repeat admin password:')

    hash_pass = hashlib.md5( admin_pass ).hexdigest()
    query = '''INSERT INTO users VALUES( 'admin', '%s', NULL )''' % hash_pass
    
    cursor.execute( query.encode('utf-8') )

    print 'Success'

def generate_secret_key():
    from base64 import urlsafe_b64encode as b64encode
    from random import randint

    rand_string = str( randint(0, 10000000) )
    encoded_string = b64encode( hashlib.md5( rand_string ).digest() )

    return encoded_string[:50]


def db_cursor(conf_values):
    '''Define a connection object for a selected database'''
    host     = conf_values['host']
    dbname   = conf_values['dbname']
    user     = conf_values['user']
    password = conf_values['pass']

    config = "host='"+ host +"' dbname='"+ dbname +"' user='"+ user +"'"
    if password:
        config += " password='"+ password +"'"

    connection  = psql.connect( config )
    cursor = connection.cursor( cursor_factory=psqlextras.RealDictCursor )

    return cursor


def syncdb():
    '''Create SQLite file with tables to make session work.'''
    current_path = os.getcwd()

    top_path = os.path.dirname( os.path.dirname( current_path ) )
    manage_path = os.path.join( top_path, 'rawsalad' )

    os.chdir( manage_path )
    command = 'python manage.py syncdb'
    subprocess.call( command )
    os.chdir( current_path )


def translate():
    '''Translate application'''
    lang = raw_input("Language of application: ")
    
    current_path = os.getcwd()

    top_path = os.path.dirname( current_path )
    translate_path = os.path.join( top_path, 'translate' )

    os.chdir( translate_path )
    command = 'python translate.py %s' % lang
    subprocess.call( command )
    os.chdir( current_path )


def minify():
    '''Minify js and css for databrowser app'''
    minify.minify_files()


if __name__ == '__main__':
    try:
        create_and_init_tables()
        user_values = create_db_configuration()
        create_settings_configuration()
        create_admin_user( user_values )
        syncdb()
        translate()
        minify()
    except Exception as e:
        print 'Something bad happened'
        print e

