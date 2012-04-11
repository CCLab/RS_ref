#-*- coding: utf-8 -*-

import csv

def morph( fname, newfname, delfields, hfields, has_total=True ):
    f = open( fname, 'rb' )
    newf = open( newfname, 'wb' )

    creader = csv.reader( f, delimiter=';', quotechar='"' )
    cwriter = csv.writer( newf, delimiter=';', quotechar='"' )
    delfields = sorted( delfields, reverse=True )

    hobject = {}

    header = creader.next()
    rowid_ind = get_ind( header, 'ID' )
    parid_ind = get_ind( header, 'Rodzic' )
    typenr_ind = get_ind( header, 'Typ' )
    name_ind = get_ind( header, 'Treść' )
    new_rows = []

    last_par_id = None
    for (i,row) in enumerate(creader):
        row_id = row[ rowid_ind ]
        par_id = row[ parid_ind ]
        if len( row[ typenr_ind ].split(' ') ) == 1:
            type_nr = ''
        else:
            type_nr = row[ typenr_ind ].split(' ')[-1]
        name = row[ name_ind ]
        # nonleaves should not be inserted, nonleaf can only be detected when
        # next row has parent field which is the same as previous row's id
        if par_id == last_par_id:
            new_rows.pop()
        
        if par_id == '':
            hobject[ row_id ] = [(name, type_nr)]
        else:
            hobject[ row_id ] = hobject[ par_id ] + [(name, type_nr)]

        hier_copy = hobject[row_id][:]
        new_rows.append( morph_row( row, delfields, hfields, hier_copy ) )
        last_par_id = row_id

    if has_total:
        new_rows.pop()

    for row in new_rows:
        cwriter.writerow( row )

    f.close()
    newf.close()
    
    
def morph_row( row, delfields, hfields, hier ):
    tmp_row = row[:]
    for i in delfields:
        del tmp_row[ i ]

    hier_row = []
    if hier[0][1] != '15' or ( len( hier ) > 1 and hier[1][1].count('/') == 0 ):
        hier.insert( 1, ('','') )
   
    for (i,field) in enumerate(hfields):
        if len( hier ) > i:
            hier_row.append( hier[i][0] )
            if field['aux']:
                hier_row.append( hier[i][1] )
        else:
            hier_row.append( '' )
            if field['aux']:
                hier_row.append( '' )

    return hier_row + tmp_row


def get_ind( header, name ):
    for (i,field) in enumerate(header):
        if field == name:
            return i

    raise RuntimeError("no name in header" + name )


if __name__ == '__main__':
    old_name = '0-0-2011.csv'
    new_name = 'data_0_0_2011.csv'
    del_fields = [0, 1, 2, 3, 4, 5, 6, 7]
    hierarchy = [
        {'aux': True},
        {'aux': True},
        {'aux': True},
        {'aux': True},
        {'aux': True}
    ]
    morph( old_name, new_name, del_fields, hierarchy, has_total=True )
    print 'Done'

