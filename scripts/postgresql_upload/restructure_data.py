#!/usr/bin/python2
# -*- coding: utf-8 -*-
import sys
import simplejson as js

# unique id
inx = 1000000000
# final list of new rows
results = []
# new ids under old ids key
visited = {}
# all the paths under id keys
paths   = {}

def make_tree( node_idef ):
    # keep ht einx unique
    global inx

    # collect all the node's children
    children = filter( lambda e: e['parent'] == node_idef, data )

    # return if it's a leaf
    if not children:
        return

    for row in children:
        # cache the old idef
        old_idef = row['idef']

        # if it's a top level - construct the top level path
        if node_idef == None:
            row['path'] = '__root__.%s' % row['idef']
        # else - read the parents path and add the node's idef to it
        else:
            row['path'] = '%s.%s' % ( paths[row['parent']], row['idef'] )

        # store the new idef under the old idefs keys
        visited[ row['idef'] ] = str( inx )
        # store the node's path
        paths[ row['idef'] ] = row['path']

        # assign a new unique id
        row['idef']   = str( inx )
        # read a new, previously stored parent by the old parent's key
        row['parent'] = visited.get( row['parent'], None )

        # remove unwanted garbage from the object
        del row['parent_sort']
        del row['idef_sort']
        del row['level']

        # save the brand new object
        results.append( row )
        # increment the unique id
        inx += 1

        # do the same with children
        make_tree( old_idef )


# load data
data = js.loads( open( sys.argv[1] ).read() )['data']

# do the magic
make_tree( None )

# show results
for r in results:
    print '%12s\t%12s\t%s' % ( r['idef'], r['parent'], r['path'] )
