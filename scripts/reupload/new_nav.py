import pymongo
import copy
from ConfigParser import ConfigParser
import simplejson as json


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
    upload_connection_info = get_db_connect('rawsdata_reupload.conf', 'local_db')

    local_host = upload_connection_info['host']
    local_port = upload_connection_info['port']
    local_dbname = upload_connection_info['database']

    local_connection = pymongo.Connection(local_host, local_port)
    local_db = local_connection[local_dbname]

    return local_db
    

def change_navigator(localdb, collname, new_collname):
    coll = localdb[collname]
    new_coll = localdb[new_collname]

    new_coll.remove()

    a_level_nodes = coll.find()

    start_id = 100000
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
                act_id += 1
                new_coll.save(tmp_row)

                
def save_json(localdb, collname, filename):
    coll = localdb[collname]
    objects = []
    for o in coll.find():
        objects.append(o)
    
    s = json.dumps(objects, encoding='utf-8', sort_keys=True, indent=4)
    f = open(filename, 'wb')
    f.write(s)
    f.close()
    

nav_collname = 'ms_nav'
new_nav_collname = 'navigator_tree'

local_db = get_connections()
print 'Connected to db'

change_navigator(local_db, nav_collname, new_nav_collname)
print 'Navigator changed'

#save_json(local_db, new_nav_collname, 'tmp.txt')

print 'All done'
