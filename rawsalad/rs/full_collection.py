# -*- coding: utf-8 -*-
import csv
import codecs
from cStringIO import StringIO
from zipfile import ZipFile

from downloader import get_table_data
from sqldb import Collection

def get_all_columns( endpoint, collection ):
    full_columns = collection.get_columns()
    
    return [ column['key'] for column in full_columns ]

def get_all_ids( endpoint, collection ):
    return collection.get_all_ids()

def create_collection_file( endpoint, conf_file ):
    import os
    from cStringIO import StringIO
    from sqldb import Collection
    from downloader import get_table_data, UnicodeWriter

    collection = Collection( endpoint, cfile=conf_file )
    all_columns = get_all_columns( endpoint, collection )
    all_ids = get_all_ids( endpoint, collection )
    
    in_memory = StringIO()
    data = get_table_data( collection, all_ids, all_columns )
    writer = UnicodeWriter( in_memory )
    for row in data:
        writer.writerow( row )
    
    collection_data = writer.get_stream().read()

    csv_file_name = endpoint + '.csv'
    top_dir_name = os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) )
    path = os.path.join( top_dir_name, 'site_media', 'csv', csv_file_name )
    collection_file = open( path, 'wb' )
    collection_file.write( collection_data )
    collection_file.close()

def create_all_files( config_file ):
    endpoints = ['data_50001', 'data_50006']

    for endpoint in endpoints:
        print 'START:', endpoint
        create_collection_file( endpoint, config_file )
        print 'END:', endpoint

if __name__ == '__main__':
    create_all_files('rawsdata.conf')
