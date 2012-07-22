#!/usr/bin/env python

import os
from string import Template

from getpass import getpass
import hashlib
import psycopg2 as psql
import psycopg2.extras as psqlextras
import subprocess
import minify


def print_header( title, step_nr ):
    star_header = '*' * 80
    title_start = ( len(star_header) - len(title) ) / 2
    title_end = title_start + len( title )
    title_part = title + ': STEP ' + str( step_nr )
    header = star_header[:title_start] + title_part  + star_header[title_end:]

    print ''
    print header
    print ''


def create_and_init_tables( step_nr ):
    print_header( 'Tables initialization', step_nr )
    user_name = raw_input('Database user name: ')
    db_name = raw_input('Database name: ')
    password = getpass('Password: ')

    command = 'psql --user %s --dbname %s --file init_db.sql' % (user_name, db_name)
    subprocess.call( command, shell=True )

    return {
        'user_name': user_name,
        'db_name'  : db_name,
        'password' : password
    }


def create_db_configuration( db_info, step_nr ):
    print_header( 'DB configuration file creation', step_nr )

    user_values = {}
    user_values['host'] = raw_input('Host with database: ')
    user_values['dbname'] = db_info['db_name']
    #user_values['dbname'] = raw_input('Database name: ')
    user_values['user'] = db_info['user_name']
    #user_values['user'] = raw_input('User name: ')
    user_values['pass'] = db_info['password']
    #user_values['pass'] = getpass('Password: ')

    print 'Creating the new file from template'
    temp_file_path = os.path.join( 'config_templates', 'db_template.cnf' )
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

def create_settings_configuration( step_nr ):
    print_header( 'Settings configuration file creation', step_nr )

    user_values = {}
    admins_count = int( raw_input('How many __django__ admins do you want to have? ' ) )
    admins = []
    admins_str = ''
    for i in range( admins_count ):
        name = raw_input("Admin's name: ")
        email = raw_input("Admin's email address: ")
        if i != 0:
            admins_str += '\n    '

        admins_str += str( (name, email) ) + ','

    user_values['admins'] = admins_str # without '[' and ']'

    def_time_zone = 'Europe/Warsaw'
    time_zone_msg = 'Time zone (default ' + def_time_zone + '): '
    user_values['time_zone'] = raw_input( time_zone_msg ) or def_time_zone

    def_lang_code = 'pl'
    lang_code_msg = 'Language code (default ' + def_lang_code + '): '
    user_values['language_code'] = raw_input( lang_code_msg ) or def_lang_code

    def_media_dir = 'site_media'
    media_dir_msg = 'Directory with media files (defualt ' + def_media_dir + '): '
    user_values['media_dir'] = raw_input( media_dir_msg ) or def_media_dir

    user_values['host_addr'] = raw_input('Host address and port for RawSalad(ip:port) : ')
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

def create_admin_user( conf_values, step_nr ):
    print_header('Creating upload-admin user', step_nr )

    cursor = db_cursor( conf_values )

    admin_name = raw_input('Upload-admin name: ')

    admin_pass = getpass('Upload-admin password: ')
    admin_pass_repeat = getpass('Repeat upload-admin password: ')

    while admin_pass != admin_pass_repeat:
        print 'Passwords are not the same! Repeat please'
        admin_pass = getpass('Upload-admin password: ')
        admin_pass_repeat = getpass('Repeat upload-admin password: ')

    hash_pass = hashlib.md5( admin_pass ).hexdigest()
    query = '''INSERT INTO users VALUES( '%s', '%s', NULL );COMMIT;''' % (admin_name, hash_pass)
    
    cursor.execute( query.encode('utf-8') )

    print 'Success'

def generate_secret_key():
    from base64 import urlsafe_b64encode as b64encode
    from random import randint

    rand_string = str( randint(0, 10000000) )
    encoded_string = b64encode( hashlib.md5( rand_string ).digest() )

    return encoded_string[:50]


def db_cursor( conf_values ):
    '''Define a connection object for a selected database'''
    host     = conf_values['host']
    dbname   = conf_values['dbname']
    user     = conf_values['user']
    password = conf_values['pass']

    config = "host='" + host + "' dbname='" + dbname + "' user='" + user + "'"
    if password:
        config += " password='" + password + "'"

    connection  = psql.connect( config )
    cursor = connection.cursor( cursor_factory=psqlextras.RealDictCursor )

    return cursor


def syncdb( step_nr ):
    '''Create SQLite file with tables to make session work.'''
    print_header( 'Creating session database', step_nr )

    current_path = os.getcwd()
    top_path = os.path.dirname( os.path.dirname( current_path ) )
    manage_path = os.path.join( top_path, 'rawsalad' )

    os.chdir( manage_path )
    command = 'python manage.py syncdb'
    subprocess.call( command, shell=True )
    os.chdir( current_path )


def translate( step_nr ):
    '''Translate application'''
    print_header( 'Translating application', step_nr )
    lang = raw_input("Language of application: ")
    
    current_path = os.getcwd()

    top_path = os.path.dirname( current_path )
    translate_path = os.path.join( top_path, 'translate' )

    os.chdir( translate_path )
    command = 'python translate.py %s' % lang
    subprocess.call( command, shell=True )
    os.chdir( current_path )


def minify_js( step_nr ):
    '''Minify js and css for databrowser app'''
    print_header( 'Minifying javascript and css', step_nr )
    minify.minify_files()


if __name__ == '__main__':
    db_info = create_and_init_tables( 1 )
    user_values = create_db_configuration( db_info, 2 )
    create_settings_configuration( 3 )
    create_admin_user( user_values, 4 )
    syncdb( 5 )
    translate( 6 )
    #minify_js( 7 )
    '''
    try:
        #db_info = create_and_init_tables( 1 )
        #user_values = create_db_configuration( db_info, 2 )
        #create_settings_configuration( 3 )
        create_admin_user( user_values, 4 )
        syncdb( 5 )
        translate( 6 )
        minify( 7 )
    except Exception as e:
        print 'Something bad happened'
        print e
    '''
