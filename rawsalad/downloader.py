# -*- coding: utf-8 -*-
import csv
import codecs
from cStringIO import StringIO
from zipfile import ZipFile


# prepare a single csv file to download
def single_file( f ):
    # if it's a full collection - read it from server
    if '.csv' in f:
        return open( 'site_media/csv/' + f ).read()
    # if it's a sheet - create a csv on the fly
    else:
        data = f.split( '|' )[:-1]
        in_memory = StringIO()

        writer = UnicodeWriter( in_memory )
        for row in data:
            writer.writerow( row.split(';') )

        return writer.get_stream().read()


# prepare a zipped bundle of csv files to download
def multiple_files( files ):
    in_memory = StringIO()
    zip_file  = ZipFile( in_memory, 'a' )

    for i, f in enumerate( files ):
        if '.csv' in f:
            csv_string = open( 'site_media/csv/' + f ).read()
        else:
            csv_string = f.replace( '|', '\n' ).encode( 'utf-8' )

        n = str(i) if i > 10 else '0'+str(i)
        zip_file.writestr( 'data-' + n + '.csv', csv_string )

    # fix for Linux zip files read in Windows
    for file in zip_file.filelist:
        file.create_system = 0

    zip_file.close()

    in_memory.seek( 0 )
    return in_memory.read()


# write unicoded file
class UnicodeWriter:
    """
    A CSV writer which will write rows to CSV file "fd",
    which is encoded in the given encoding.
    """

    def __init__( self, fd, dialect=csv.excel, encoding="utf-8", **kwds ):
        # Redirect output to a queue
        self.queue   = StringIO()
        self.writer  = csv.writer( self.queue, dialect=dialect, delimiter=';', **kwds )
        self.stream  = fd
        self.encoder = codecs.getincrementalencoder( encoding )()

    def writerow( self, row ):
        self.writer.writerow([ s.encode("utf-8") for s in row ])
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



