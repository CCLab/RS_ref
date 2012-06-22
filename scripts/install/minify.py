#!/usr/bin/env python

import os
import shutil
import re
import subprocess


def minify( min_file_name, files, end, dst_path ):
    min_file = open( min_file_name, 'wb' )

    for name in files:
        if name.endswith( end ):
            print 'Compressing file', name
            f = open( name, 'rb' )
            content = f.read()

            cmd = 'yui-compressor ' + name
            minified_content = subprocess.Popen( cmd, shell=True, stdout=subprocess.PIPE ).stdout.read()
            min_file.write( minified_content )
            min_file.write( '\n' )

            f.close()

    min_file.close()

    # Copy min.js to directory with js files
    shutil.copyfile( min_file_name, dst_path )

    # Remove temporary min.js
    os.remove( min_file_name )

def get_js_minify_file_names( html_file ):
    ''' Get js names from minification area. '''
    with open( html_file, 'rb' ) as f:
        content = f.read()
    
    start = content.find('<!-- minification area')
    end = content.rfind('<!-- OEF minification area')

    partial_content = content[start:end]
    files = re.findall( r'[\w]+\.js', partial_content )

    return files

def update_html( html_file, js_files ):
    ''' Change js files from minification area to min.js '''
    with open( html_file, 'rb' ) as f:
        content = f.read()

    mini_area_start = content.find('minification area')
    mini_area_end = content.rfind('OEF minification area')

    mini_area = content[ mini_area_start : mini_area_end ]

    # remove lines with js files except the last one
    regexp = r'^.*?\.js.*?$'
    mini_area = re.sub( regexp, '', mini_area, len( js_files ) - 1, re.MULTILINE )

    # change name of the last js file to min.js
    last_js_name = js_files[-1]
    mini_area = mini_area.replace( last_js_name, 'min.js' )

    # remove empty lines
    mini_area = mini_area.replace( '\n\n', '' )

    content = content[ :mini_area_start ] + mini_area + content[ mini_area_end: ]

    with open( html_file, 'wb' ) as f:
        f.write( content )

   # LESS minification  ?

def minify_files():
    ''' Minify js files and change html file. '''
    current_dir = os.getcwd()

    top_dir = os.path.dirname( os.path.dirname( current_dir ) )
    js_dir = os.path.join( top_dir, 'rawsalad', 'site_media', 'js' )
    css_dir = os.path.join( top_dir, 'rawsalad', 'site_media', 'css' )
    html_dir = os.path.join( top_dir, 'rawsalad', 'databrowser', 'templates' )

    min_js_path = os.path.join( js_dir, 'min.js' )
    min_css_path = os.path.join( css_dir, 'min.css' )

    html_file = os.path.join( html_dir, 'app.html' )

    js_files = get_js_minify_file_names( html_file )

    css_files = os.listdir( css_dir )

    js_paths = [ os.path.join( js_dir, name ) for name in js_files ]
    css_paths = [ os.path.join( css_dir, name ) for name in css_files ]

    minify( 'min.js', js_paths, '.js', min_js_path )
    # maybe not
    #minify( 'min.css', css_paths, '.css', min_css_path )

    update_html( html_file, js_files )



if __name__ == '__main__':
    minify_files()

