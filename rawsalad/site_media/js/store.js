// Copyright (c) 2011, Centrum Cyfrowe
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
//   * Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//   * Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation
//     and/or other materials provided with the distribution.
//   * Neither the name of the Centrum Cyfrowe nor the names of its contributors
//     may be used to endorse or promote products derived from this software
//     without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
// GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
// OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

var _store = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};

    // DBTREE FUNCTIONS

    // Download db tree describing collections.
    that.get_collections = function ( callback ) {
        var respond = function () {
            var data = _tree.copy( get_db_tree() );
            callback( data );
        };

        if( has_db_tree() ) {
            respond();
        }
        else {
            _db.get_collections_list( function ( data ) {
                save_db_tree( data );
                respond();
            });
        }
    };

    // Get copy of tree with all nodes from collection with id = col_id.
    that.get_collection_data = function ( endpoint, callback ) {
        if ( !has_meta_data( endpoint ) ) {
            return undefined;
        } else {
            return _tree.tree_to_list( get_data_source( endpoint ) );
        }
    };

    that.get_top_parent = function ( endpoint ) {
        var tree_id = get_endpoint_id( endpoint );
        var top_parent = _tree.get_top_parent( get_db_tree(), tree_id );

        if ( !top_parent ) return undefined;

        return top_parent;
    };

    that.get_collection_name = function( endpoint ) {
        var id = get_endpoint_id( endpoint );
        var node = _tree.get_node( get_db_tree(), id );

        return node['label'];
    };

    // DATA TREE FUNCTIONS
    // Download meta data and first level nodes of collection with id = col_id.
    that.get_init_data = function ( endpoint, callback ) {
        var respond = function ( data_source, meta_source ) {
            var data = _tree.get_children_nodes( data_source );
            var meta = $.extend( true, {}, meta_source );
            callback( data, meta );
        };
        var data_source;
        var meta_source;

        if ( has_data( endpoint ) ) {
            data_source = get_data_source( endpoint );
            meta_source = get_meta_data_source( endpoint );
            respond( data_source, meta_source );
        } else {
            _db.get_init_data( endpoint, function ( db_data ) {
                // save data and meta data, return it in callback
                data_source = store_data( db_data['data'], endpoint );
                meta_source = store_meta_data( db_data['meta'], endpoint );
                respond( data_source, meta_source );
            });
        }
    };

    // Get children of parent_id node from col_id collection.
    that.get_children = function ( endpoint, parent_id, callback ) {
        var respond = function ( data_source ) {
            var children;
            
            if ( parent_id === endpoint ) {
                //children = _tree.get_children_nodes( data_source );
                children = _tree.get_nonempty_children_nodes( data_source );
            } else {
                //children = _tree.get_children_nodes( data_source, parent_id );
                children = _tree.get_nonempty_children_nodes( data_source, parent_id );
            }
            callback( children );
        };
        var data_source;
        var children;

        if ( has_data( endpoint, parent_id ) ) {
            data_source = get_data_source( endpoint );
            respond( data_source );
        } else {
            _db.get_children( endpoint, parent_id, function ( db_data ) {
                data_source = store_data( db_data, endpoint );
                respond( data_source );
            });
        }
    };

    that.get_top_level = function( endpoint, callback ) {
        that.get_children( endpoint, endpoint, callback );
    };

    that.get_columns = function( endpoint ) {
        var meta_data;
        var columns_copy;

        meta_data = get_meta_data_source( endpoint );
        columns_copy = $.extend( true, [],  meta_data['columns'] );

        return columns_copy;
    };

    that.get_ancestors_ids = function( endpoint, id ) {
        var data_source = get_data_source( endpoint );
        var ancestors = _tree.get_ancestors( data_source, id );
        ids_list = ancestors.map( function ( node ) {
            return node['id'];
        });

        return ids_list;
    };


    // SEARCH FUNCTIONS
    that.get_search_count = function( endpoints, query, callback ) {
        _db.get_search_count( endpoints, query, callback );
    };

    that.get_search_data = function( endpoint, query, callback ) {
        var get_meta = !has_meta_data( endpoint );
        var data_copy;
        var meta;
        var meta_copy;

        _db.get_search_data( endpoint, query, get_meta, function ( db_data ) {
            data_source = store_data( db_data['data'], endpoint, true );
            if ( get_meta ) {
                meta = store_meta_data( db_data['meta'], endpoint );
            } else {
                meta = get_meta_data_source( endpoint );
            }
            data_copy = _tree.tree_to_list( data_source );
            meta_copy = $.extend( true, {}, meta );
            meta_copy['columns'] = meta_copy['columns'].filter( function ( column ) {
                return column['basic'];
            });
            
            callback( data_copy, meta_copy, db_data['boxes'] );
        });
    };


    // PERMALINK FUNCTIONS
    that.store_state = function( permalink_data, callback ) {
        _db.store_state( permalink_data, callback );
    };

    that.restore_state = function( permalink_id, endpoint, callback ) {
        _db.restore_state( permalink_id, endpoint, function ( endpoint_data ) {
            // don't know which data is from searched permalink,
            // so think that all data comes from it
            store_data( endpoint_data['data'], endpoint_data['endpoint'], true );
            store_meta_data( endpoint_data['meta'], endpoint_data['endpoint'] );

            callback( endpoint_data );
        });
    };

// P R I V A T E   I N T E R F A C E

    // data tree about data
    var db_tree;
    // tree for each collection
    var data_sources = {};
    // information about complete children
    var complete_children = {};
    // contains meta data for each collection
    var meta_sources = {};
    // maps endpoints to their id in collection tree
    var endpoint_map = {};

    // Does store have children of parent_id(default parent is root) in col_id collection.
    function has_data( endpoint, parent_id ) {
        if ( parent_id === undefined ) {
            parent_id = endpoint;
        }
        return has_all_children( parent_id );
    }

    // Does store have all children of parent_id in col_id collection.
    function has_all_children( parent_id ) {
        return !!complete_children[ parent_id ];
    }

    // Saves information about having downloaded all children of parent_id node in
    // col_id collection.
    function mark_parent_complete( parent_id ) {
        complete_children[ parent_id ] = true;
    }

    function has_data_source( endpoint ) {
        return !!data_source[ endpoint ];
    }

    function get_data_source( endpoint ) {
        return data_sources[ endpoint ];
    }

    function has_meta_data( endpoint ) {
        return !!meta_sources[ endpoint ];
    }

    function get_meta_data_source( endpoint ) {
        return meta_sources[ endpoint ];
    }

    function add_endpoint_id( endpoint, tree_id ) {
        endpoint_map[ endpoint ] = tree_id;
    }

    function get_endpoint_id( endpoint ) {
        return endpoint_map[ endpoint ];
    }

    // Save downloaded data. If the data does not come from search, save
    // information about having full first level.
    function store_data( db_data, endpoint, searched ) {
        var data_source = get_data_source( endpoint );
        var searched = searched || false;
        
        if ( !data_source ) {
            data_source = _tree.create_tree( db_data, 'id', 'parent' );
            data_sources[ endpoint ] = data_source;
            if ( !searched ) {
                mark_parent_complete( endpoint );
            }
        } else {
            if ( !searched ) {
                // TODO: check execution time
                _tree.update_tree( data_source, db_data );
            } else {
                db_data.forEach( function ( node ) {
                    _tree.insert_node( data_source, node );
                });
            }
        }
        
        if ( !searched ) {
            // could save parent_complete information multiple times
            // but it doesn't matter
            db_data.forEach( function ( node ) {
                mark_parent_complete( node['parent'] );
            });
        }
        
        return data_source;
    }

    function store_meta_data( db_meta_data, endpoint ) {
        meta_sources[ endpoint ] = db_meta_data;
        return db_meta_data;
    }

    function has_db_tree() {
        return !!db_tree;
    }

    function get_db_tree() {
        return db_tree;
    }

    function save_db_tree( data ) {
        db_tree = _tree.create_tree( data, 'id', 'parent' );
        db_tree.forEach( function ( node ) {
            if ( !!node['endpoint'] ) {
                add_endpoint_id( node['endpoint'], node['id'] );
            }
        });
    }

    return that;
}) ();
