# -*- coding: utf-8 -*-

import os
import csv
import sys
import shutil
from string import Template


def get_possible_languages( translation_file_name ):
    try:
        file = open( translation_file_name, 'rb' )
        reader = csv.reader( file, delimiter=';', quotechar='"' )
    except Exception as e:
        exit('Problem with file: %s, %s' % ( translation_file_name, e) )

    header = reader.next()

    return header[1:] # without template field

def clear_tmp_dirs( dirs ):
    for directory in dirs:
        files = os.listdir( directory )
        for f in files:
            path = os.path.join( directory, f )
            os.remove( path )

def make_translation_dict( translation_file_name, lang ):
    field_nr = None
    translation_dict = {}

    try:
        file = open( translation_file_name, 'rb' )
        reader = csv.reader( file, delimiter=';', quotechar='"' )
    except Exception as e:
        exit('Problem with file: %s, %s' % ( translation_file_name, e) )

    for i, row in enumerate(reader):
        if i == 0:
            for j, row_lang in enumerate(row):
                if row_lang == lang:
                    field_nr = j
                    break
            if not field_nr:
                raise RuntimeError('Language %s not find in translation file' % lang)
        else:
            template_key = row[0]
            replacement = row[field_nr]
            translation_dict[template_key] = replacement
    
    return translation_dict


def translate_file(input_path, output_dir, translation_file_name, lang):
    try:
        file = open(input_path, 'rb')
    except IOError:
        exit('Error: unable to open file to translate. Exiting now.')
    
    content = file.read()
    file.close()

    translation = make_translation_dict(translation_file_name, lang)
    template = Template(content)
    translated_content = template.substitute(translation)

    input_file_name = os.path.basename(input_path)
    new_file_name = input_file_name.replace('_template', '')
    new_file_path = os.path.join(output_dir, new_file_name)
    
    try:
        new_file = open(new_file_path, 'wb')
        new_file.write(translated_content)
        new_file.close()
    except IOError:
        exit('Error: unable to save translated file. Exiting now.')


def get_template_files( path ):
    all_files = os.listdir( path )
    return [ n for n in all_files if n.endswith('js') or n.endswith('html') ]


highest_level_dir = os.path.dirname( os.path.dirname(os.getcwd()) )

databrowser_translated_dir = os.path.join( highest_level_dir, 'rawsalad', 'databrowser', 'templates' )
js_translated_dir = os.path.join( highest_level_dir, 'rawsalad', 'site_media', 'js' )
uploader_translated_dir = os.path.join( highest_level_dir, 'rawsalad', 'uploader', 'templates' )

databrowser_tmp_dir = os.path.join( os.getcwd(), 'tmp', 'databrowser' )
js_tmp_dir = os.path.join( os.getcwd(), 'tmp', 'js' )
uploader_tmp_dir = os.path.join( os.getcwd(), 'tmp', 'uploader' )

databrowser_dir = os.path.join( os.getcwd(), 'templates', 'databrowser' )
databrowser_file_names = get_template_files( databrowser_dir )

uploader_dir = os.path.join( os.getcwd(), 'templates', 'uploader' )
uploader_file_names = get_template_files( uploader_dir )

translation_file = 'translation.csv'
lang = 'polish'
tmp_dirs = [ databrowser_tmp_dir, js_tmp_dir, uploader_tmp_dir ]
check = False

languages = get_possible_languages( translation_file )

if len(sys.argv) in [2, 3]:
    if sys.argv[1] in languages:
        lang = sys.argv[1]
        print 'Using language: ', lang

        if len(sys.argv) == 3 and sys.argv[2] == '--check':
            check = True
    else:
        print 'Unexpected language: ', sys.argv[1]
        print 'Use on of those:',
        for l in languages:
            print l
        exit()
else:
    print 'usage: python replace.py <language> | optional: --check'
    print 'Possible languages:'
    for l in languages:
        print '*', l
    print 'Check => translate files, but do not copy them to the destination directory'
    exit()

print '*** Removing old translated files ***'
clear_tmp_dirs( tmp_dirs )

print '*** Translating files ***'
for name in databrowser_file_names:
    print 'Translating file', name, '...',

    full_path = os.path.join( databrowser_dir, name )
    if name.endswith( 'html' ):
        output_dir = databrowser_tmp_dir
    else:
        output_dir = js_tmp_dir

    translate_file( full_path, output_dir, translation_file, lang )

    print 'done'

for name in uploader_file_names:
    print 'Translating file', name, '...',

    full_path = os.path.join( uploader_dir, name )
    translate_file( full_path, uploader_tmp_dir, translation_file, lang )
    
    print 'done'

if not check:
    print '*** Copying files ***'
    databrowser_files = os.listdir( databrowser_tmp_dir )
    for f in databrowser_files:
        src_file = os.path.join( databrowser_tmp_dir, f )
        dst_file = os.path.join( databrowser_translated_dir, f )
        print 'copy file', src_file, '-->', dst_file
        shutil.copyfile( src_file, dst_file )

    js_files = os.listdir( js_tmp_dir )
    for f in js_files:
        src_file = os.path.join( js_tmp_dir, f )
        dst_file = os.path.join( js_translated_dir, f )
        print 'copy file', src_file, '-->', dst_file
        shutil.copyfile( src_file, dst_file )

    uploader_files = os.listdir( uploader_tmp_dir )
    for f in uploader_files:
        src_file = os.path.join( uploader_tmp_dir, f )
        dst_file = os.path.join( uploader_translated_dir, f )
        print 'copy file', src_file, '-->', dst_file
        shutil.copyfile( src_file, dst_file )


print '*** All files are done ***'
