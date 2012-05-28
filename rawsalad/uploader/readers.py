#-*- coding: utf-8 -*-

'''
This file contains classes to handle getting data from different sources,
which provide consistent interface for uploader.
'''

'''
Possible modifications:
1) Change way of obtaining data to upload -> create new class extending BasicDataSrc
2) Change way of defining hierarchy -> create new class extending BasicHierarchy
3) Change way of uploading data -> create new class extending BasicUploader
'''

from urllib2 import urlopen

from collections import deque
from exceptions import StopIteration

from csv import reader as csvreader
import simplejson as json
import string

class BasicReader:
    '''Read data from a source. Can be used as iterator.'''
    def __init__( self, src, std_size=10000, stop_sign='\n', enc='utf-8' ):
        self.src = src
        self.size = std_size
        self.buffer = deque()
        self.stop_sign = stop_sign
        self.enc = enc

    def __iter__( self ):
        return self

    def next( self ):
        '''Read until comes across stop_sign or end of data.'''
        row = []

        while self.stop_sign not in self.buffer:
            bulk = self.read_bulk()
            if bulk == '':
                raise StopIteration
            self.buffer += bulk
        
        # Get data from the buffer until stop_sign.
        left = ''
        while left != self.stop_sign:
            left = self.buffer.popleft()
            row.append( left )

        return (''.join( row ))
                
    def read_bulk( self, size=None ):
        '''Read size bytes of data, if bytes is not specified, then default
        value will be used.'''
        read_size = size if size is not None else self.size

        # Copy data to tmp buffer and clear the original one
        bulk = self.src.read( read_size - len( self.buffer ) )
        self.buffer += bulk
        buffer_copy = ''.join( self.buffer )
        self.buffer.clear()

        return buffer_copy

    def read_all( self ):
        '''Read all data.'''
        bulk = self.src.read()
        self.buffer += bulk
        buffer_copy = ''.join( self.buffer )
        self.buffer.clear()

        return buffer_copy

    def is_all_read( self ):
        '''Checks if anything is left in the buffer.'''
        data_part = self.src.read(1)
        if data_part != '':
            self.buffer.append( data_part )

        return len( self.buffer ) == 0


class FileReader(BasicReader):
    '''Reads data from a file.'''
    def __init__( self, filename, std_size=10000, stop_sign='\n', enc='utf-8' ):
        self.src = open( filename, 'rb' )
        self.size = std_size
        self.buffer = deque()
        self.stop_sign = stop_sign
        self.enc = enc

    def __del__( self ):
        self.src.close()


class UrlReader(BasicReader):
    '''Reads data from a URL.'''
    def __init__( self, url, std_size=10000, stop_sign='\n', enc='utf-8' ):
        self.src = urlopen( url )
        self.size = std_size
        self.buffer = deque()
        self.stop_sign = stop_sign
        self.enc = enc

    def __del__( self ):
        self.src.close()


class Meta:
    '''Reads meta data from a data source. Meta data contains collection name and description,
       hierarchy description, columns description. Data reader should be an instance of a subclass
       of BasicReader.'''
    def __init__( self, reader ):
        self.reader = reader
        content = reader.read_all()
        json_content = json.loads( content )

        self.node = {
            'name': json_content['name'],
            'description': json_content['description'],
            'label': json_content['label']
        }
        self.columns = json_content['columns']
        self.hierarchy = json_content['hierarchy']
        self.parents = json_content['parents']

    def get_node( self ):
        return self.node

    def get_columns( self ):
        return self.columns

    def get_hierarchy( self ):
        return self.hierarchy

    def get_parents( self ):
        return self.parents

    
class DataReceiver:
    '''Receives data from a data source and knows how to interpret it. Data reader
       is an instance of a subclass of BasicReader.'''
    def __init__( self, reader ):
        self.reader = reader 
        self.rows = deque()
        self.buffer = ''

    def read_rows( self ):
        '''Gets at least one row from the data source if not everything is read.'''
        self.buffer += self.reader.read_bulk()
        while not self.is_row_in_buffer() and not self.reader.is_all_read():
            self.buffer += self.reader.read_bulk()

        splitted_for_rows = self.buffer.split('\n')
        if self.reader.is_all_read():
            self.buffer = ''
        else:
            self.buffer = splitted_for_rows[-1]
            del splitted_for_rows[-1]

        return splitted_for_rows

    def get_rows( self ):
        if len( self.rows ) == 0:
            return self.read_rows()
        else:
            rows_copy = list( self.rows )
            self.rows.clear()
            return rows_copy

    def get_all_rows( self ):
        list_rows = []
        while not self.reader.is_all_read():
            list_rows += self.get_rows()

        return list_rows

    def is_row_in_buffer( self ):
        return '\n' in self.buffer


class CSVDataReceiver(DataReceiver):
    '''Receives data from the CSV file.'''
    def __init__( self, reader, delim=';', quote='"' ):
        self.reader = csvreader( reader, delimiter=delim, quotechar=quote )
        self.rows = deque()
        self.buffer = ''

    def get_rows( self ):
        '''If any row is left, returns the first one, otherwise returns [].'''
        try:
            return self.reader.next()
        except:
            return []

    def get_all_rows( self ):
        '''Gets all rows from the CSV file.'''
        rows = []
        try:
            while True:
                rows.append( self.reader.next() )
        except:
            return rows


# TODO: Not working yet

class APIDataReceiver(DataReceiver):
    '''Receives data from API'''
    def __init__( self, base_url ):
        self.rows = deque()
        self.buffer = ''
        self.base_url = base_url
        top_data_url = base_url + 'a/'
        top_reader = UrlReader( top_data_url, stop_sign=None )
        top_data = top_reader.read_all()
        json_data = json.loads( top_data )
        self.top_data = json_data['data']
        self.next_ind = 0

    def get_rows( self ):
        try:
            rows = self.get_subtree( self.top_ids[ self.next_ind ] )
            self.next_ind += 1
            return rows
        except:
            return []

    def get_all_rows( self ):
        rows = []
        try:
            while True:
                rows += self.get_rows()
        except:
            return rows

    def get_children( self, prev_url, par_id, level ):
        url = self.next_level_url( prev_url, par_id, level )
        ureader = UrlReader( url, stop_sign=None )
        children_str = ureader.read_all()
        children = json.loads( children_str )['data']
        return children

    def get_children_rec( self, prev_url, par_id, level ):
        data = []
        children = self.get_children( prev_url, par_id, level )
        for child in children:
            data.append( child )
            if not child['leaf']:
                url = self.next_level_url( prev_url, par_id, level )
                data += self.get_children_rec( url, child['idef'], level + 1 )

        return data

    def get_subtree( self, ind ):
        data = [ self.top_data[ ind ] ]
        root_id = self.top_data[ ind ]['idef']
        if not act_root['leaf']:
            data += self.get_children_rec( self.base_url, root_id, 0 )

        return data

    def next_level_url( self, prev_url, par_id, level ):
        next_level = level + 1
        next_letter = string.lowercase[ next_level ]
        return ( prev_url + '%s/%s/' % ( par_id, next_letter ) )


