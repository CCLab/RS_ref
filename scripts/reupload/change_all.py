#!/usr/bin/python
import pymongo
from ConfigParser import ConfigParser

def get_db_connect(fullpath, dbtype):
    """Returns dict representing Connection to db.
    Arguments:
    fullpath -- path to config file
    dbtype -- type of db to connect
    """
    connect_dict= {}

    defaults= {
        'basedir': fullpath
    }

    cfg= ConfigParser(defaults)
    cfg.read(fullpath)
    connect_dict['host'] = cfg.get(dbtype,'host')
    connect_dict['port'] = cfg.getint(dbtype,'port')
    connect_dict['database'] = cfg.get(dbtype,'database')
    connect_dict['username'] = cfg.get(dbtype,'username')
    try:
        connect_dict['password'] = cfg.get(dbtype,'password')
    except:
        connect_dict['password'] = ''

    return connect_dict


def get_connection():
    connection_info = get_db_connect('rawsdata_reupload.conf', 'local_db')

    local_host = upload_connection_info['host']
    local_port = upload_connection_info['port']
    local_dbname = upload_connection_info['database']

    local_connection = pymongo.Connection(local_host, local_port)
    local_db = local_connection[local_dbname]

    #user = upload_connection_info['username']
    #password = upload_connection_info['password']
    #authenticated = local_db.authenticate(user, password)
    #if authenticated != 1:
    #    exit('Local db not authenticated')

    return server_db, local_db


def create_counter(db, counter_collname):
    coll = db[counter_collname]
    doc = {
        'metadata': 100000,
        'data': 10000000,
        'permalinks': 1000
    }

    coll.save(doc)


def change_navigator(db, collname, new_collname, counter_collname):
    coll = db[collname]
    new_coll = db[new_collname]
    counter_coll = db[counter_collname]

    new_coll.remove()

    a_level_nodes = coll.find()
    old_style_mapping = {}

    counter_doc = counter_coll.find_one()
    start_id = counter_doc['metadata']
    act_id = start_id

    for dataset in a_level_nodes:
        dataset_id = act_id
        act_id += 1
        views = dataset['perspectives']

        tmp_row = copy.deepcopy(dataset)
        del tmp_row['perspectives']
        del tmp_row['idef']
        tmp_row['_id'] = dataset_id
        tmp_row['parent_id'] = None

        new_coll.save(tmp_row)
        for view in views:
            view_id = act_id
            act_id += 1
            issues = view['issues']

            tmp_row = copy.deepcopy(view)
            del tmp_row['issues']
            del tmp_row['idef']
            tmp_row['_id'] = view_id
            tmp_row['parent_id'] = dataset_id

            new_coll.save(tmp_row)
            for issue in issues:
                tmp_row = {
                    '_id': act_id,
                    'parent_id': view_id,
                    'name': issue
                }
                old_style_mapping[(dataset, view, issue)] = act_id
                act_id += 1
                new_coll.save(tmp_row)

    counter_doc['metadata'] = act_id
    counter_coll.save(counter_doc)

    return old_style_mapping


def create_meta_data(db, meta_collname, new_meta_collname, attributes_map, dvi_map):
    coll = db[meta_collname]
    new_coll = db[new_meta_collname]

    old_meta_data = coll.find()
    for meta_descr in old_meta_data:
        new_meta_descr = {}
        for attr in attributes_map:
            new_meta_descr[attr['new']] = meta_descr[attr['old']]
        dataset = meta_descr['dataset']
        view = meta_descr['idef']
        issue = meta_descr['issue']
        new_meta_descr['_id'] = dvi_map[(dataset, view, issue)]

        new_coll.save(new_meta_descr)

    
def change_id(db, collname, new_names, counter_collname, queries=[{}]):
    if 1 < len(new_names) != len(queries):
        exit('Number of names > 1 and != number of queries')
    
    next_id_coll = db[id_collname]
    next_id_doc = next_id_coll.find_one()
    next_id = next_id_doc['data']

    old_coll = db[collname]
    for i, name in enumerate(new_names):
        print 'Changing ids in collection', collname, 'query', queries[i]
        coll = db[name]
        query = queries[i]

        db_data = old_coll.find(query)
        old_data = [row for row in db_data]
        new_data = []
        # idef_sort is unique, so case a[..] = b[..] can be omitted
        old_data = sort(cmp=lambda a, b: a['idef_sort'] > b['idef_sort'])
        id_mapper = {}
        for row in old_data:
            id_mapper['idef'] = next_id
            new_row = row[:]
            new_row['_id'] = next_id
            next_id += 1
            new_data.append(new_row)

        for row in new_data:
            coll.save(row)

        next_id_doc['data'] = next_id
        next_id_coll.save(next_id_doc)



tree_collname = 'ms_nav'
new_tree_collname = 'db_tree'

meta_collname = 'md_budg_scheme'
new_meta_collname = 'metadata'

counter_collname = 'counters'
budg_collname = 'dd_budg2011_tr'
budg_collname_new = 'dd_budg2011_tr_copy'
nfz_collname = 'dd_fund2011_nfz'
nfz_collname_new = ['dd_fund2011_nfz_agregated', 'dd_fund2011_nfz_regions']

attributes_map = [
    {'old': 'name', 'new': 'perspective'},
    {'old': 'collection', 'new': 'ns'},
    {'old': 'aux', 'new': 'aux'},
    {'old': 'columns', 'new': 'columns'},
    {'old': 'batch_size', 'new': 'batch_size'}
]

queries = [
    { 'node': 0 },
    { 'node': 1 }
]

db = get_connection()
print 'Connected to db'

create_counter(db, counter_collname)
print 'Counter created'

dvi_map = change_navigator(db, tree_collname, new_tree_collname, counter_collname)
print 'Db tree created'

create_meta_data(db, meta_collname, new_meta_collname, attributes_map, dvi_map)
print 'Meta data created'

change_id(db, budg_collname, [budg_collname_new], counter_collname, queries=[{}])
print 'Budget changed'

change_id(db, nfz_collname, nfz_collname_new, counter_collname, queries=queries)
print 'NFZ changed'

print 'All done'
