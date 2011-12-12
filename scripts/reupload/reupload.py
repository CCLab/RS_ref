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


def get_connections():
    download_connection_info = get_db_connect('rawsdata_reupload.conf', 'server_db')
    upload_connection_info = get_db_connect('rawsdata_reupload.conf', 'local_db')

    server_host = download_connection_info['host']
    server_port = download_connection_info['port']
    server_dbname = download_connection_info['database']

    server_connection = pymongo.Connection(server_host, server_port)
    server_db = server_connection[server_dbname]

    user = download_connection_info['username']
    password = download_connection_info['password']
    authenticated = server_db.authenticate(user, password)
    if authenticated != 1:
        exit('Server db not authenticated')

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


def move_navigator(serverdb, localdb, collname):
    servercoll = serverdb[collname]
    localcoll = localdb[collname]

    localcoll.remove()

    budg_doc = servercoll.find_one({'idef': 0})
    budg_doc['perspectives'] = budg_doc['perspectives'][:1]
    nfz_doc = servercoll.find_one({'idef': 3})
    nfz_doc['idef'] = 1

    localcoll.save(budg_doc)
    localcoll.save(nfz_doc)


def move_meta(serverdb, localdb, collname):
    servercoll = serverdb[collname]
    localcoll = localdb[collname]

    localcoll.remove()
    budg_doc = servercoll.find_one({'dataset': 0, 'idef': 0})
    localcoll.save(budg_doc)
    nfz_docs = servercoll.find({'dataset': 3})
    for nfz_doc in nfz_docs:
        nfz_doc['dataset'] = 1
        localcoll.save(nfz_doc)


def move_budgdata(serverdb, localdb, collname):
    servercoll = serverdb[collname]
    localcoll = localdb[collname]

    localcoll.remove()
    all_rows = servercoll.find()
    for row_doc in all_rows:
        localcoll.save(row_doc)


def move_nfzdata(serverdb, localdb, collname, queries):
    servercoll = serverdb[collname]
    localcoll = localdb[collname]

    localcoll.remove()
    for query in queries:
        all_rows = servercoll.find(query)
        for row_doc in all_rows:
            localcoll.save(row_doc)


nav_collname = 'ms_nav'
meta_collname = 'md_budg_scheme'
budg_collname = 'dd_budg2011_tr'
nfz_collname = 'dd_fund2011_nfz'
queries = [
    { 'node': 0 },
    { 'node': 1 }
]

data_collnames = [budg_collname]


server_db, local_db = get_connections()
print 'Connected to both dbs'

move_navigator(server_db, local_db, nav_collname)
print 'Navigator moved'

move_meta(server_db, local_db, meta_collname)
print 'Metadata moved'

move_budgdata(server_db, local_db, budg_collname)
print 'Budget data moved'

move_nfzdata(server_db, local_db, nfz_collname, queries)
print 'Nfz data moved'

print 'All done'
