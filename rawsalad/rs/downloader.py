# -*- coding: utf-8 -*-
import csv
import codecs
from cStringIO import StringIO
from zipfile import ZipFile


# prepare a single csv file to download
def single_file( f ):
    # if it's a full collection - read it from server
    endpoint = f['endpoint']
    try:
        ids = f['ids']
        columns = f['columns']
    except KeyError:
        # full collection
        return open( 'site_media/csv/' + endpoint + '.csv' ).read()
    else:
        # table
        in_memory = StringIO()
        data = get_table_data( endpoint, ids, columns )
        writer = UnicodeWriter( in_memory )
        for row in data:
            writer.writerow( row )
        
        return writer.get_stream().read()


# prepare a zipped bundle of csv files to download
def multiple_files( files ):
    in_memory = StringIO()
    zip_file  = ZipFile( in_memory, 'a' )

    for i, f in enumerate( files ):
        csv_string = single_file( f )
        n = str(i) if i > 10 else '0'+str(i)
        zip_file.writestr( 'data-' + n + '.csv', csv_string )

    # fix for Linux zip files read in Windows
    for file in zip_file.filelist:
        file.create_system = 0

    zip_file.close()

    in_memory.seek( 0 )
    return in_memory.read()

# Get data for rows with id in ids list, each row has changed
# hierarchy and data fields matching columns.
def get_table_data( endpoint, ids, columns ):
    from sqldb import Collection
    collection = Collection( endpoint )
    hierarchy = get_hierarchy( endpoint )
    cleaned_columns = clean_columns( columns )
    
    header = get_header( collection, hierarchy, cleaned_columns )
    data = [ header ]
    for id in ids:
        data.append( get_row( collection, id, cleaned_columns, hierarchy ) )
    
    return data
    
def clean_columns( columns ):
    # type and name columns are deleted because of changing hierarchy type
    return filter( lambda key: key not in ['type', 'name'], columns )
    
# Get header that contains hierarchy columns and labels that correspond
# to keys list.
def get_header( collection, hierarchy, keys ):
    columns = collection.get_columns()
    needed_columns = filter( lambda col: col['key'] in keys, columns )
    
    hierarchy_labels = []
    for level in hierarchy:
        hierarchy_labels.append( decode_value( level['label'] ) )
        if level['aux']:
            hierarchy_labels.append( decode_value( level['aux_label'] ) )
            
    col_labels = [ decode_value( col['label'] ) for col in needed_columns ]

    header = hierarchy_labels + col_labels
    return header

# Get row from collection, change its hierarchy type and cut off fields that
# are not in columns list and convert fields to encoded strings.
def get_row( collection, id, columns, hierarchy ):
    node = collection.get_nodes( id )[0]
    parents = collection.get_unique_parents( id )
    path = get_hierarchy_path( node, parents )
    hierarchy_fields = get_hierarchy_fields( path, hierarchy )
    data_fields = [ node['data'][ column ] for column in columns ]
    row = hierarchy_fields + data_fields
    
    str_row = [ decode_value( field ) for field in row ]
    return str_row
    
# Get types and names of node and his ancestors.
def get_hierarchy_path( node, parents ):
    path = []
    for p in parents:
        path.append({
            'type': p['data']['type'],
            'name': p['data']['name']
        })
    path.append({
        'type': node['data']['type'],
        'name': node['data']['name']
    })
    
    return path
    
def decode_value( value ):
    if isinstance( value, basestring ):
        return value.decode('utf-8')
    else:
        return value
        
def encode_value( value ):
    if isinstance( value, basestring ):
        return value.encode('utf-8')
    else:
        return value
    
# Get list containing hierarchy fields for new hierarchy type. Hierarchy
# in a collection is specified by hierarchy, name and type values are in path.
def get_hierarchy_fields( path, hierarchy ):
    hierarchy_fields = []
    
    for i, level in enumerate( hierarchy ):
        if i < len( path ):
            hierarchy_fields.append( path[ i ]['name'] )
            if level['aux']:
                aux_value = get_aux_value( path[ i ]['type'] )
                hierarchy_fields.append( aux_value )
        else:
            hierarchy_fields.append( '' )
            if level['aux']:
                hierarchy_fields.append( '' )
        
    return hierarchy_fields
    
def get_aux_value( value ):
    aux_value = value.rsplit(' ', 1)[-1]
    try:
        return int( aux_value )
    except:
        return aux_value

# TODO: make a table in db and get hierarchy from it
def get_hierarchy( endpoint ):
    #from sqldb import Collection
    #collection = Collection( endpoint )
    #hierarchy = collection.get_hierarchy()
    return [
        {
            'label'    : 'Czesc',
            'aux'      : True,
            'aux_label': 'Numer czesci'
        },
        {
            'label'    : 'Dzial',
            'aux'      : True,
            'aux_label': 'Numer dzialu'
        },
        {
            'label'    : 'Rozdzial',
            'aux'      : True,
            'aux_label': 'Numer rozdzialu'
        }
    ]

# write unicoded file
class UnicodeWriter:
    """
    A CSV writer which will write rows to CSV file "fd",
    which is encoded in the given encoding.
    """

    def __init__( self, fd, dialect=csv.excel, encoding="utf-8", **kwds ):
        # Redirect output to a queue
        self.queue   = StringIO()
        self.writer  = csv.writer( self.queue, dialect=dialect, delimiter=';',
                                   quotechar='"', quoting=csv.QUOTE_NONNUMERIC, **kwds )
        self.stream  = fd
        self.encoder = codecs.getincrementalencoder( encoding )()

    def writerow( self, row ):
        self.writer.writerow([ encode_value( s ) for s in row ])
        # Fetch UTF-8 output from the queue ...
        data = self.queue.getvalue()
        data = data.decode( "utf-8" )
        # ... and reencode it into the target encoding
        data = self.encoder.encode( data )
        # write to the target stream
        self.stream.write( data )
        # empty queue
        self.queue.truncate( 0 )

    def writerows( self, rows ):
        for row in rows:
            self.writerow( row )

    def get_stream( self ):
        self.stream.seek( 0 )
        return self.stream



