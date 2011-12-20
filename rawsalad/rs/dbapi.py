# -*- coding: utf-8 -*-
import os
import re
from pymongo import Connection
from ConfigParser import ConfigParser
from time import time

meta_src    = "metadata"
counters    = "counters"
#nav_schema    = "ms_nav"
nav_schema  = "db_tree"

# TODO make http response work better (use http headers)

# TODO create Resource class that REALLY abstracts DB work
class Resource:
    pass

# TODO make it a singleton
# TODO define app entry points and move db connection to session
class DBConnection:
    def __init__( self, db_type='mongodb' ):
        '''Define a connection object for a selected database'''
        # TODO move config file path into SETTINGS
        dir_path  = os.path.dirname( __file__ )
        conf_file = os.path.join( dir_path, 'rawsdata.conf' )

        cfg = ConfigParser({ 'basedir': conf_file })
        cfg.read( conf_file )

        self.host     = cfg.get( db_type, 'host' )
        self.port     = cfg.getint( db_type, 'port' )
        self.database = cfg.get( db_type, 'database' )
        self.username = cfg.get( db_type, 'username' )
        try:
            self.password = cfg.get( db_type, 'password' )
        except:
            # must be instance of basestring
            self.password = ''


    def connect( self ):
        '''Connect to db and return a connection singleton'''
        # if connection not established yet - connect
        try:
            return self.db
        except:
            connection = Connection( self.host, self.port )
            self.db    = connection[ self.database ]
            self.db.authenticate( self.username, self.password )

            return self.db


class DBNavigator:
    '''Navigator tree'''
    def __init__( self, db_type='mongodb' ):
        self.db = DBConnection( db_type ).connect()


    def get_db_tree( self, query={} ):
        '''Get the navigation tree for all database collections'''
        cursor  = self.db[ nav_schema ].find( query )
        db_tree = [ row for row in cursor ]
        # sorting metadata before serving
        db_tree.sort( cmp=lambda a, b: a['_id'] - b['_id'] )

        return db_tree

#
# TODO use it with a new API code
#
#    def get_node( self, _id ):
#        '''Get certain position in the db_tree'''
#        data = self.get_db_tree({ '_id': _id })
#
#        try:
#            return data[0].get( '_id', None )
#        except IndexError:
#            return None
#
#
#    def get_parent( self, _id ):
#        '''Get parent of the certain position in the db_tree'''
#        # get original node to get its parent id
#        node   = self.get_node( _id )
#        parent = self.get_node( node['parent'] )
#
#        return parent
#
#
#    def get_parents( self, _id ):
#        '''Get all parents up to the root of the db_tree'''
#        parents = []
#
#        parent = self.get_parent( _id )
#        while parent != None:
#            parent.append( parent['_id'] )
#            parent = self.get_parent( parent['_id'] )
#
#        return parents
#
#
#    def get_children( self, _id ):
#        '''Get children of the certain position in the db_tree'''
#        data = self.get_db_tree({ 'parent', _id })
#
#        return data


class Collection:
    '''Class for extracting data from acenrtain endpoint in the db'''
    # TODO move db connection to the session
    def __init__( self, endpoint, db=None, db_type='mongodb' ):
        # connect to db
        self.db = db or DBConnection( db_type ).connect()
        # define the endpoint
        self.endpoint = endpoint
        # get the complete metadata
        self.metadata = self.db['metadata'].find_one({ '_id': self.endpoint })


    def get_metadata( self ):
        '''Get the metadata of the collection'''
        # TODO do we really need to return all metadata
        #      potentially split into two methods: full/not-full md
        return self.metadata

    def get_columns( self ):
        '''Get full list of columns of the collection'''
        metadata = self.get_metadata()

        return metadata

    def get_top_level( self ):
        '''Get the top level of the collection'''
        return self.get_data({ 'parent': None })

    def get_node( self, _id ):
        '''Get the certain node in the collection'''
        data = self.get_data({ '_id': _id })

        return data[0]

    def get_children( self, _id ):
        '''Get children of the specified node'''
        return self.get_data({ 'parent': _id })

    def get_data( self, query={}, fields=None ):
        '''Get queried data from db'''
        order      = [( '_id', 1 )]
        col_name   = self.metadata.get( 'collection', None );
        collection = self.db[ col_name ]
        batchsize  = self.metadata.get( 'batchsize', None )

        if fields == None:
            fields = self.get_all_fields()

        if batchsize == None:
            cursor = collection.find( query, fields, sort=order )
        else:
            cursor = collection.find( query, fields, sort=order ).batch_size( batchsize )

        data = [ d for d in cursor ]

        return data


    def get_all_fields( self ):
        # aggregate columns fields and aux
        fields  = [ c['key'] for c in self.metadata.get( 'columns', [] ) ]
        fields += self.metadata.get( 'aux', [] )

        all_fields = {}
        for field in fields:
            all_fields[ field ] = 1

        return all_fields

#    def get_metadata(self, datasrc, dataset_id, view_id, issue):
#
#        # used for counting
#        count_query = metadata_complete['query']
#
#        # define useless keys
#        useless_keys= [ 'collection', 'aux', 'batchsize', '_id' ]
#
#        if len(self.raw_query) != 0: # the query is on the specific elements
#            useless_keys.append('max_level') # so, max_level is also useless
#            count_query.update(self.raw_query)
#
#        # but before delete useless keys - counting children of a given parent
#        count= self.get_count(datasrc, metadata_complete['ns'], count_query)
#        if count == 0:
#            self.response= Response().get_response(10)
#        else:
#            metadata_complete['count']= count
#
#            for curr in useless_keys: # now delete useless keys
#                if curr in metadata_complete:
#                    del metadata_complete[curr]
#
#            field_list_complete= metadata_complete.pop('columns')
#            field_list= []
#            field_names_complete= []
#            if len(self.raw_usrdef_fields) > 0: # describe only user defined columns
#                for fld in field_list_complete:
#                    field_names_complete.append(fld['key']) # for future check
#                    if fld['key'] in self.raw_usrdef_fields:
#                        field_list.append(fld)
#                self.fill_warning(field_names_complete) # fill self.warning
#            else:
#                field_list= field_list_complete # substitute 'columns' for 'fields'
#
#            metadata_complete['fields']= field_list # to match the name of URL parameter
#            metadata= metadata_complete
#
#        return metadata
#



#    def set_query(self, query):
#        if query is not None:
#            self.raw_query= query
#
#    def set_fields(self, field_list= None):
#        if field_list is not None:
#            self.request_fields= { k:1 for k in field_list }
#        else:
#            self.request_fields= { }
#
#
#
#    def save_complete_metadata(self, new_object, dbase):
#        """
#        saves metadata defined by a user
#        into the db collection for metadata
#        """
#        ds_id, ps_id, iss= new_object['dataset'], new_object['idef'], new_object['issue']
#        update_status= True # true - update, false - insert
#        if new_object is not None:
#            current_object= dbase[meta_src].find_one({ 'dataset': ds_id, 'idef': ps_id, 'issue': iss })
#            if current_object is None: # is dataset-view-issue already in the db?
#                current_object= {}
#                update_status= False # insert instead of update
#            else:
#                current_object= { '_id': current_object['_id'] } # only _id is required for save()
#
#            current_object.update(new_object)
#
#            try:
#                dbase[meta_src].save(current_object)
#                if update_status:
#                    self.response= Response().get_response(1) # OK, updated
#                else:
#                    self.response= Response().get_response(2) # OK, inserted
#            except Exception as e:
#                self.response= Response().get_response(41) # ERROR, can't insert into the db
#                self.response['descr']= ' '.join([ self.response['descr'], str(e) ])
#
#        else:
#            self.response= Response().get_response(43) # ERROR, bad request - data is empty
#
#        return ds_id, ps_id, iss, update_status
#
#
#    def save_doc(self, new_doc, dataset_id, view_id, issue, idef, dbase):
#        """
#        saves new_dict (a dictionary) into specified doc in the db
#        """
#        qry= { 'idef': idef }
#        self.set_query(qry)
#        orig_doc= self.get_data(dbase, dataset_id, view_id, issue)
#        coll_name= self.metadata_complete['ns'] # get_data calls for complete metadata
#
#        if self.response['httpresp'] == 200: # record found
#            orig_doc= orig_doc[0] # expecting only one element
#            orig_doc.update(new_doc)
#
#            try:
#                dbase[coll_name].update(qry, orig_doc) # update doc by its idef
#            except Exception as e:
#                self.response= Response().get_response(44) # ERROR, can't insert into the db
#                self.response['descr']= ' '.join([ self.response['descr'], str(e) ])
#
#        return self.response
#
#
#
#    def get_tree(self, datasrc, dataset_id, view_id, issue):
#        tree= []
#
#        metadata_complete= self.get_complete_metadata(
#            int(dataset_id), int(view_id), str(issue), datasrc
#            )
#
#        if metadata_complete is None: # no such source
#            self.response= Response().get_response(20)
#            self.request= "unknown"
#        else:
#            self.response= Response().get_response(0)
#            self.request= metadata_complete['name']
#
#            conn_coll= metadata_complete['ns'] # collection name
#
#            cursor_fields= self.get_fields(metadata_complete) # full columns list
#            cursor_sort= self.get_sort_list(metadata_complete) # list of sort columns
#
#            cursor_query= metadata_complete['query'] # initial query
#            clean_query= cursor_query.copy() # saving initial query for iteration
#            if len(self.raw_query) == 0: # no additional query, extract the whole collection in a form of a tree
#                cursor_query.update({ 'level': 'a' })
#                cursor_data= datasrc[conn_coll].find(cursor_query, cursor_fields, sort=cursor_sort)
#                for curr_root in cursor_data:
#                    if 'idef' in clean_query: del clean_query['idef'] # clean the clean_query before it starts working
#                    if 'parent' in clean_query: del clean_query['parent']
#                    curr_branch= self.build_tree(datasrc[conn_coll], clean_query, cursor_fields, cursor_sort, curr_root['idef'])
#                    tree.append(curr_branch)
#            else:
#                if 'idef' in self.raw_query: # root element
#                    result_tree= self.build_tree(datasrc[conn_coll], cursor_query, cursor_fields, cursor_sort, self.raw_query['idef'])
#                    if result_tree is not None:
#                        tree.append(result_tree)
#                    else: # error
#                        self.response= Response().get_response(10)
#                else: # means we deal with URL like /a/X/b/ or /a/X/b/Y/c - which is nonesense for a tree
#                    self.response= Response().get_response(30)
#
#        return tree
#
#
#    def build_tree(self, cl, query, columns, sortby, root):
#        out= {}
#
#        query['idef']= root
#
#        root_elt= cl.find_one(query, columns, sort=sortby)
#        if root_elt is not None:
#            if not root_elt['leaf']: # there are children
#                if 'idef' in query: del query['idef'] # don't need this anymore
#                self._get_children_recurse(root_elt, cl, query, columns, sortby)
#            else: # no children, just leave root_elt as it is
#                pass
#            out.update(root_elt)
#        else: # error - no such data!
#            out= None
#
#        return out
#
#    def _get_children_recurse(self, parent, coll, curr_query, columns, srt):
#        if not parent['leaf']:
#            parent['children']= []
#            curr_query['parent']= parent['idef']
#            crs= coll.find(curr_query, columns, sort=srt)
#            if crs.count() > 0:
#                for elm in crs:
#                    parent['children'].append(elm)
#                    self._get_children_recurse(elm, coll, curr_query, columns, srt)
#
#
#    def get_count(self, datasrc, collection, count_query= {}):
#        self.count= datasrc[collection].find(count_query).count()
#        return self.count
#
#
#
#
#    def get_sort_list(self, meta_data):
#        sort_list= []
#        try:
#            cond_sort= meta_data['sort']
#        except:
#            cond_sort= None
#
#        if cond_sort is not None:
#            srt= [int(k) for k, v in cond_sort.iteritems()]
#            srt.sort()
#            for sort_key in srt:
#                sort_list.append((cond_sort[str(sort_key)].keys()[0], cond_sort[str(sort_key)].values()[0]))
#
#        return sort_list
#
#    def fill_warning(self, field_names_list):
#        """
#        check if there are user defined fields
#        that are not listed in metadata
#        """
#        warning_list= []
#        for fld in self.raw_usrdef_fields:
#            if fld not in field_names_list:
#                warning_list.append( fld )
#        if len(warning_list) == 0:
#            pass
#        elif len(warning_list) == 1:
#            self.warning= "There is no such column as '%s' in meta-data!" % warning_list[0]
#        elif len(warning_list) > 1:
#            self.warning= "There are no such columns as ['%s'] in meta-data!" % "', '".join(warning_list)


class StateManager:
    def __init__( self, db_type='mongodb' ):
        # connect to db
        self.db = DBConnection( db_type ).connect()


    def save_state( self, state ):
        counters     = self.db['counters']
        permalinks   = self.db['permalinks']

        # get last permalink id and increment it
        permalink_id = counters.find_one()['permalinks'] + 1

        # save the permalink
        permalinks.insert({
            '_id'   : permalink_id,
            'state' : state
        });
        # and set a current id as the last one in counters
        counters.update( {}, { '$set': { 'permalinks': permalink_id }} );

        return permalink_id


    def get_state( self, permalink_id ):
        permalinks = self.db['permalinks']

        # get the state object stored in db
        state = permalinks.find_one({ '_id': permalink_id })

        # substitute list of open ids with actual data: level 'a' + open branches
        for group in groups:
            endpoint   = group['endpoint']
            collection = Collection( endpoint, db=self.db )

            # get the full list of collection columns
            group['columns'] = collection.get_columns()

            # get data for each sheet in the group
            for sheet in group['sheets']:
                if sheet['filtered']:
                    # TODO TODO TODO
                    # TODO TODO TODO
                    # TODO new method in Collection class!
                    pass
#                    find_query= { '$in': sheet['rows'] }
#                    collection.set_query({ 'idef': find_query })
#                    data = collection.get_data( db, d, v, i )
#
#                    # TODO make sheet['rows'], sheet['breadcrumbs'] and data be sorted the same way!!
#                    # TODO re-code it one sipmle for over zip( data, sheet['breeadcrumbs'] )
#                    if sheet['filtered']:
#                        for filtered_row in data:
#                            for j, rw in enumerate( sheet['rows'] ):
#                                if filtered_row['idef'] == rw:
#                                    filtered_row.update({ 'breadcrumb': sheet['breadcrumbs'][j] })
#                                    break
                else:
                    data = []
                    for _id in sheet['rows']:
                        data += self.collect_children( collection, parent_id, {} )

                    sheet['rows'] = data

        return groups


    def collect_children( self, collection, parent_id, visited ):
        # hit the top level
        if not parent_id:
            return []
        # already been there
        elif parent_id in visited:
            return []
        # get children
        else:
            visited[ parent_id ] = True

            node     = collection.get_node( parent_id )
            children = collection.get_children( parent_id )

            return children + self.collect_children( collection, node['parent'], visited )



#class Query:
#    def __init__( self ):
#        pass
#
#    def build_query( idef_list):
#        """Build regex for mongo query"""
#        # TODO understand why it's limited
#        # TODO in long term - get rid of this limit
#        results_limit = 275
#
#        if len( idef_list ) < results_limit:
#            lookup = ''.join( [ r'(%s)|' % build_idef_regexp( idef ) for idef in idef_list ] )
#            # cutting the last symbol | in case it's the end of list
#            lookup = lookup[:-1]
#
#        return lookup
#
#
#    def build_idef_regexp( idef ):
#        """Build regexp quering collection"""
#        level_num = idef.count('-')
#
#        # TODO make it recursive to be readable
#        # TODO shouldn't it be done by '$or' mongo operator
#        # TODO move it all to the db module!!
#        # build regexp for the given idef plus it's context (siblings and full parental branch)
#        if level_num > 0: # deeper than 'a'
#            idef   = idef.rsplit('-', 1)[0]
#            lookup = r'^%s\-[A-Z\d]+$' % idef
#            level  = 1
#            while level < level_num:
#                idef    = idef.rsplit('-', 1)[0]
#                lookup += r'|^%s\-[A-Z\d]+$' % idef
#                level  += 1
#
#            lookup += r'|^[A-Z\d]+$'
#        else:
#            lookup = r'^[A-Z\d]+$'
#
#        return lookup
#
#
#
#
#class Search:
#    """
#    the class searches through data in mongo
#    """
#    def __init__(self):
#        self.set_query( None )
#        self.set_scope( None )
#        self.strict= False
#        self.found= {} # results in short form
#        self.response= Response().get_response(0) # Search class is optimistic
#
#    def __del__(self):
#        self.found= None
#
#    def set_query(self, query):
#        self.qrystr= query
#
#    def set_scope(self, scope):
#        self.scope= scope
#
#    def set_lookup(self, lookup):
#        self.lookup= lookup
#        if lookup is None:
#            self.lookup= []
#
#    def switch_strict(self, strict):
#        if strict:
#            self.strict= True
#
#    def do_search(self, regx, dbconn, collect):
#        """
#        TO-DO:
#        - search with automatic substitution of specific polish letters
#          (lowercase & uppercase): user can enter 'lodz', but the search
#          should find 'Łódż' as well
#        - search with flexible processing of prefixes and suffixes
#          (see str.endswith and startswith)
#        - search in 'info' keys (???)
#        """
#
#        ns_list= [] # list of results
#        error_list= []
#        found_num= 0 # number of records found
#        exclude_fields= ['idef', 'idef_sort', 'parent', 'parent_sort', 'level'] # not all fields are searchable!
#
#        for sc in self.scope: # fill the list of collections
#            sc_list= sc.split('-')
#            dataset, idef, issue= int(sc_list[0]), int(sc_list[1]), str(sc_list[2])
#            collect.set_fields( ["perspective", "ns", "columns"] )
#            metadata= collect.get_complete_metadata(dataset, idef, issue, dbconn)
#            if metadata is None:
#                error_list.append('collection not found %s' % sc)
#            else:
#                curr_coll_dict= {
#                    'perspective': metadata['perspective'],
#                    'dataset': dataset,
#                    'view': idef,
#                    'issue': issue,
#                    'data': []
#                    }
#
#                collect.set_fields(None) # presumed to search through all fields
#                for fld in metadata['columns']:
#                    if 'processable' in fld:
#
#                        check_str= fld['type'] == 'string'
#                        if len(self.lookup) > 0:
#                            check_valid= fld['key'] in self.lookup
#                        else:
#                            check_valid= fld['key'] not in exclude_fields
#
#                        if fld['processable'] and check_str and check_valid:
#                            search_query= { fld['key']: regx }
#                            collect.set_query(search_query)
#
#                            # actual query to the db
#                            found= collect.get_data(dbconn, dataset, idef, issue)
#
#                            for found_elt in found:
#                                # control of what is already found
#                                if sc not in self.found:
#                                    self.found[sc]= []
#                                if found_elt['idef'] not in self.found[sc]:
#                                    self.found[sc].append(found_elt['idef'])
#
#                                    curr_coll_dict['data'].append({
#                                        'key': fld['key'],
#                                        'text': found_elt[str(fld['key'])],
#                                        'idef': found_elt['idef'],
#                                        'parent': found_elt['parent']
#                                        })
#                                    found_num += 1
#
#                if len(curr_coll_dict['data']) > 0:
#                    ns_list.append(curr_coll_dict)
#
#        out_dict= { 'records_found': found_num, 'result': ns_list }
#        if len(error_list) > 0:
#            out_dict['errors']= error_list
#
#        return out_dict
#
#
#    def build_regexp(self, searchline, strict):
#        """ construct regexp for search """
#        if strict:
#            # version 1 - have problems
#            # searchline= "^%(lookupstr)s([^a-z][^A-Z][^0-9]|\s)|([^a-z][^A-Z][^0-9]|\s)%(lookupstr)s([^a-z][^A-Z][^0-9]|\s)|([^a-z][^A-Z][^0-9]|\s)%(lookupstr)s$" % { "lookupstr": searchline }
#            # version 2
#            searchline= r"^%(lookupstr)s(\s)+|^%(lookupstr)s$|\s+%(lookupstr)s\s+|\s+%(lookupstr)s$" % { "lookupstr": searchline }
#        return searchline
#
#    def search_data(self, datasrc, qrystr, scope, strict, lookup= None):
#        self.set_query(qrystr)
#        self.set_scope(scope)
#        self.switch_strict(strict)
#        self.set_lookup(lookup)
#
#        regxsearch= self.build_regexp( self.qrystr, self.strict )
#        regx= re.compile(regxsearch, re.IGNORECASE)
#
#        coll= Collection()
#        out= { }
#        total_rec= 0
#
#        self.found= {}
#
#        # 1st pass
#        tl1= time() # starting to search
#        result_1= self.do_search(regx, datasrc, coll)
#        total_rec += result_1['records_found']
#        tlap1= time()-tl1 # 1st pass finished
#        result_1.update( { "search_time": "%0.6f" % tlap1 } )
#        out['strict']= result_1
#
#        # 2nd pass
#        second_pass_list= []
#        if not self.strict: # second pass makes sense
#            result_2= { 'records_found': 0 } # blank dict for 2nd pass
#            tl2= time() # starting to search
#
#            second_pass_list= self.qrystr.split(' ')
#            if len(second_pass_list) > 1: # 2nd pass makes sense only if search str consists of >1 words
#
#                for wrd in second_pass_list:
#                    lookup= self.build_regexp(wrd, True) # we look for separate words using strict
#                    regx= re.compile(lookup, re.IGNORECASE)
#                    result_2_curr= self.do_search(regx, datasrc, coll)
#
#                    if result_2_curr['records_found'] > 0:
#                        result_2['result']= result_2_curr['result']
#                        result_2['records_found'] += result_2_curr['records_found']
#
#                    total_rec += result_2_curr['records_found']
#
#            tlap2= time()-tl2 # 2nd pass finished
#            result_2.update( { "search_time": "%0.6f" % tlap2 } )
#
#            out['loose']= result_2
#
#        tlap= time()-tl1
#        out.update( {
#            'search_time_total': "%0.6f" % tlap,
#            'records_found_total': total_rec
#            } )
#
#        return out
#
#    def search_text( self, datasrc, qrystr, scope, strict, display=['idef'] ):
#        self.set_query(qrystr)
#        self.set_scope(scope)
#        self.switch_strict(strict)
#
#        out= { 'result': [] }
#        self.found= {}
#        qry_dict= { }
#
#        collect= Collection()
#
#        words_list= qrystr.strip().lower().split(' ')
#        if len(words_list) > 1: # multiple words
#            kwds_list= []
#            for word in words_list:
#                query_regx= r'^%s' % word
#                # query_regx= r'%s' % word # WARNING! it works, but extremely slow!
#                if strict:
#                    query_regx += '$'
#                    # query_regx = '^' + query_regx + '$'
#                kwds_list.append({ '_keywords': re.compile(query_regx) })
#            qry_dict.update({ '$and': kwds_list })
#        elif len(words_list) == 1: # one word
#            query_regx= r'^%s' % qrystr
#            # query_regx= r'%s' % qrystr # WARNING! it works, but extremely slow!
#            if strict:
#                query_regx += '$'
#                # query_regx = '^' + query_regx + '$'
#            qry_dict.update( { '_keywords': re.compile(query_regx) } )
#
#        collect.set_query(qry_dict)
#
#        tl1= time() # starting to search
#        found_total= 0
#
#        # iterating through collections
#        error_list= []
#        for sc in self.scope: # fill the list of collections
#            found_num= 0
#            sc_list= sc.split('-')
#            dataset, idef, issue= int(sc_list[0]), int(sc_list[1]), str(sc_list[2])
#            collect.set_fields( ["perspective", "ns"] ) # WARNING! eventually we can add "columns" here for indication where the result is found
#            metadata= collect.get_complete_metadata(dataset, idef, issue, datasrc)
#
#            if metadata is None:
#                error_list.append('collection not found %s' % sc)
#            else:
#                curr_coll_dict= {
#                    'perspective': metadata.get('perspective', ''),
#                    'dataset': dataset,
#                    'view': idef,
#                    'issue': issue,
#                    'data': []
#                    }
#
#                collect.set_fields(display)
#
#                # actual query to the db
#                found= collect.get_data(datasrc, dataset, idef, issue)
#                for rec in found:
#                    curr_coll_dict['data'].append(rec)
#                    found_num += 1
#
#            if found_num > 0:
#                found_total += found_num
#                out['result'].append(curr_coll_dict)
#
#        tlap= time()-tl1
#        out.update( {
#            'search_time_total': "%0.6f" % tlap,
#            'records_found_total': found_total
#            } )
#
#        return out
#
#
#
## TODO make it HTTP response, not pseudo-response
#class Response:
#    """
#    response object
#    returns dict with http response and description
#    """
#    def __init__(self):
#        self.code= 0 # Response class is optimistic
#        self.response_dict= {
#            '0': {
#                'httpresp': 200,
#                'descr': 'OK'
#                },
#            '1': {
#                'httpresp': 200,
#                'descr': 'OK: Data successfully updated'
#                },
#            '2': {
#                'httpresp': 200,
#                'descr': 'OK: Data successfully inserted'
#                },
#            '10': {
#                'httpresp': 404,
#                'descr': 'ERROR: No such data!'
#                },
#            '20': {
#                'httpresp': 404,
#                'descr': 'ERROR: No such meta-data!'
#                },
#            '30': {
#                'httpresp': 400,
#                'descr': 'ERROR: Bad request!'
#                },
#            '31': {
#                'httpresp': 400,
#                'descr': 'ERROR: Scope +TO+ is applicable to the codes on the same level!'
#                },
#            '32': {
#                'httpresp': 400,
#                'descr': 'ERROR: Wrong sequence in the scope +TO+!'
#                },
#            '33': {
#                'httpresp': 400,
#                'descr': 'ERROR: Scope +TO+ should include only 2 elements!'
#                },
#            '34': {
#                'httpresp': 400,
#                'descr': 'ERROR: Syntax error in scope definition!',
#                },
#            '35': {
#                'httpresp': 400,
#                'descr': 'ERROR: Format not specified!'
#                },
#            '36': {
#                'httpresp': 400,
#                'descr': 'ERROR: Search string not given!'
#                },
#            '37': {
#                'httpresp': 404,
#                'descr': 'ERROR: No such collection(s)!'
#                },
#            '40': {
#                'httpresp': 404,
#                'descr': 'ERROR: No data for specified state id!'
#                },
#            '41': {
#                'httpresp': 500,
#                'descr': 'ERROR: Cannot insert data into the db!'
#                },
#            '42': {
#                'httpresp': 400,
#                'descr': 'ERROR: Wrong state id!'
#                },
#            '43': {
#                'httpresp': 404,
#                'descr': 'ERROR: No data specified!'
#                },
#            '44': {
#                'httpresp': 500,
#                'descr': 'ERROR: Cannot update document!'
#                },
#            }
#
#    def __del__(self):
#        pass
#
#    def get_response(self, code):
#        self.code= code
#        self.http_resp= self.response_dict[str(code)]['httpresp']
#        self.descr= self.response_dict[str(code)]['descr']
#        return self.response_dict[str(code)]
#

