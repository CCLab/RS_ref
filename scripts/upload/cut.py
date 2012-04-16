#-*- coding: utf-8 -*-


from csv import writer as csvwriter
from csv import reader as csvreader

if __name__ == '__main__':
    fname = 'api_copy.csv'
    fname2 = 'cut_api_copy.csv'

    fin = open( fname, 'rb' )
    fout = open( fname2, 'wb' )

    creader = csvreader( fin, delimiter=';', quotechar='"' )
    cwriter = csvwriter( fout, delimiter=';', quotechar='"' )

    for r in creader:
        del r[7]
        del r[6]
        cwriter.writerow( r )

    fin.close()
    fout.close()
    print 'Done'
 
