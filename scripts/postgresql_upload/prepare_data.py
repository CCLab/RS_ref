# -*- coding: utf-8 -*-
parents = {}
inx = 1000000000

print '-- Budżet centralny > tradycyjny > 2011'
print 'BEGIN;'
for row in open('budget.csv'):
    cols = row[:-1].split(';')
    parents[ cols[0] ] = str( inx )

    print "INSERT INTO data_50001 VALUES (",
    print str( inx ), ',',
    print parents.get( cols[1], 'NULL' ), ',',
    print cols[2].replace('"', "'"), ',',
    print cols[3].replace('"', "'"), ',',
    print cols[4].replace('"', "'"), ',',
    print cols[5].replace('"', "'"), ',',
    print cols[6].replace('"', "'"), ',',
    print cols[7].replace('"', "'"), ',',
    print cols[8].replace('"', "'"), ',',
    print cols[9].replace('"', "'"), ',',
    print cols[10].replace('"', "'"), ',',
    print cols[11].replace('"', "'"), ',',
    print 'NULL, NULL );'

    inx += 1

print 'COMMIT;'

print '\n-- NFZ > zagregowane > 2011'
print 'BEGIN;'
for row in open('nfz_01.csv'):
    cols = row[:-1].split(';')
    parents[ cols[0] ] = str( inx )

    print "INSERT INTO data_50002 VALUES (",
    print str( inx ), ',',
    print parents.get( cols[1], 'NULL' ), ',',
    print cols[0].replace('"', "'").replace('-', '.'), ',',
    print cols[2].replace('"', "'"), ',',
    print cols[3].replace('"', "'"), ',',
    print cols[4].replace('"', "'"), ',',
    print cols[5].replace('"', "'"), ',',
    print cols[6].replace('"', "'"), ',',
    print cols[7].replace('"', "'"), ',',
    print cols[8].replace('"', "'"), ',',
    print cols[9].replace('"', "'"), ',',
    print cols[10].replace('"', "'"), ',',
    print cols[11].replace('"', "'"), ',',
    print cols[12].replace('"', "'"), ',',
    print cols[13].replace('"', "'"), ',',
    print cols[14].replace('"', "'"), ',',
    print cols[15].replace('"', "'"), ',',
    print cols[16].replace('"', "'"), ',',
    print cols[17].replace('"', "'"), ',',
    print cols[18].replace('"', "'"), ',',
    print cols[19].replace('"', "'"), ',',
    print cols[20].replace('"', "'"), ',',
    print cols[21].replace('"', "'"), ',',
    print 'NULL, NULL );'

    inx += 1

print 'COMMIT;'

print '\n-- NFZ > regionalne > 2011'
print 'BEGIN;'
for row in open('nfz_02.csv'):
    cols = row[:-1].split(';')
    parents[ cols[0] ] = str( inx )

    print "INSERT INTO data_50003 VALUES (",
    print str( inx ), ',',
    print parents.get( cols[1], 'NULL' ), ',',
    print cols[0].replace('"', "'").replace('-', '.'), ',',
    print cols[2].replace('"', "'"), ',',
    print cols[3].replace('"', "'"), ',',
    print 'NULL, NULL );'

    inx += 1

print 'COMMIT;'


print '\n-- EFRR > gminy > 2010'
print 'BEGIN;'
for row in open('efrr_g2010.csv'):
    cols = row[:-1].split(';')
    parents[ cols[0] ] = str( inx )

    print "INSERT INTO data_50004 VALUES (",
    print str( inx ), ',',
    print parents.get( cols[1], 'NULL' ), ',',
    print cols[2].replace('"', "'"), ',',
    print cols[3].replace('"', "'"), ',',
    print cols[4].replace('"', "'"), ',',
    print cols[5].replace('"', "'"), ',',
    print cols[6].replace('"', "'"), ',',
    print cols[7].replace('"', "'"), ',',
    print cols[8].replace('"', "'"), ',',
    print cols[9].replace('"', "'"), ',',
    print cols[10].replace('"', "'"), ',',
    print cols[11].replace('"', "'"), ',',
    print cols[12].replace('"', "'"), ',',
    print cols[13].replace('"', "'"), ',',
    print cols[14].replace('"', "'"), ',',
    print cols[15].replace('"', "'"), ',',
    print cols[16].replace('"', "'"), ',',
    print cols[17].replace('"', "'"), ',',
    print cols[18].replace('"', "'"), ',',
    print cols[19].replace('"', "'"), ',',
    print cols[20].replace('"', "'"), ',',
    print cols[21].replace('"', "'"), ',',
    print cols[22].replace('"', "'"), ',',
    print cols[23].replace('"', "'"), ',',
    print cols[24].replace('"', "'"), ',',
    print cols[25].replace('"', "'"), ',',
    print 'NULL );'

    inx += 1

print 'COMMIT;'

print '\n-- EFRR > gminy > 2011'
print 'BEGIN;'
for row in open('efrr_g2011.csv'):
    cols = row[:-1].split(';')
    parents[ cols[0] ] = str( inx )

    print "INSERT INTO data_50005 VALUES (",
    print str( inx ), ',',
    print parents.get( cols[1], 'NULL' ), ',',
    print cols[2].replace('"', "'"), ',',
    print cols[3].replace('"', "'"), ',',
    print cols[4].replace('"', "'"), ',',
    print cols[5].replace('"', "'"), ',',
    print cols[6].replace('"', "'"), ',',
    print cols[7].replace('"', "'"), ',',
    print cols[8].replace('"', "'"), ',',
    print cols[9].replace('"', "'"), ',',
    print cols[10].replace('"', "'"), ',',
    print cols[11].replace('"', "'"), ',',
    print cols[12].replace('"', "'"), ',',
    print cols[13].replace('"', "'"), ',',
    print cols[14].replace('"', "'"), ',',
    print cols[15].replace('"', "'"), ',',
    print cols[16].replace('"', "'"), ',',
    print cols[17].replace('"', "'"), ',',
    print cols[18].replace('"', "'"), ',',
    print cols[19].replace('"', "'"), ',',
    print cols[20].replace('"', "'"), ',',
    print cols[21].replace('"', "'"), ',',
    print cols[22].replace('"', "'"), ',',
    print cols[23].replace('"', "'"), ',',
    print cols[24].replace('"', "'"), ',',
    print cols[25].replace('"', "'"), ',',
    print 'NULL );'

    inx += 1

print 'COMMIT;'

print '-- Budżet centralny > sprawozdanie > 2011'
print 'BEGIN;'
for row in open('sprawozdanie_w2010.csv'):
    cols = row[:-1].split(';')
    parents[ cols[0] ] = str( inx )

    print "INSERT INTO data_50006 VALUES (",
    print str( inx ), ',',
    print parents.get( cols[1], 'NULL' ), ',',
    print cols[2].replace('"', "'"), ',',
    print cols[3].replace('"', "'"), ',',
    print cols[4].replace('"', "'"), ',',
    print cols[5].replace('"', "'"), ',',
    print cols[6].replace('"', "'"), ',',
    print cols[7].replace('"', "'"), ',',
    print cols[8].replace('"', "'"), ',',
    print cols[9].replace('"', "'"), ',',
    print cols[10].replace('"', "'"), ',',
    print cols[11].replace('"', "'"), ',',
    print cols[12].replace('"', "'"), ',',
    print 'NULL );'

    inx += 1

print 'COMMIT;'
