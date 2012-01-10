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

    // Download db tree describing collections.
    that.get_collections_list = function ( callback ) {
        var respond = function () {
            var data = _tree.tree_to_list( get_db_tree() );
            callback( data );
        };

        if( has_db_tree() ) {
            respond();
        }
        else {
            _db.get_db_tree( function ( data ) {
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
            return _tree.to_list( get_data_source[ endpoint ] );
        }
    };

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
                children = _tree.get_children_nodes( data_source );
            } else {
                children = _tree.get_children_nodes( data_source, parent_id );
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
                // Store is not sure if it has all children of parent_id,
                // downloads them and updates tree(inserting new nodes).
                data_source = get_data_source( endpoint );
                // TODO: check execution time
                _tree.update_tree( data_source, db_data );
                mark_parent_complete( parent_id );
                
                respond( data_source );
            });
        }
    };

    that.get_top_level = function ( endpoint, callback ) {
        that.get_children( endpoint, endpoint, callback );
    };

    that.get_collection_name = function( col_id ) {
        var node = _tree.get_node( get_db_tree(), col_id );
        
        return node['label'];
    };

    that.get_columns = function( endpoint ) {
        var meta_data;
        var columns_copy;

        meta_data = get_meta_data_source( endpoint );
        columns_copy = $.extend( true, {}, meta_data['columns'] );

        return columns_copy;
    };

    that.get_search_count = function ( endpoints, query, callback ) {
        _db.get_search_count( endpoints, query, callback );
    };

    that.get_search_data = function ( endpoint, query, callback ) {
        var get_meta = !has_meta_data( endpoint );
        var data_copy;
        var meta;
        var meta_copy;

        _db.get_search_data( endpoint, query, get_meta, function ( db_data ) {
            data_source = get_data_source( endpoint );
            if ( get_meta ) {
                meta = store_meta_data( db_data['meta'], endpoint );
            } else {
                meta = get_meta_data_source( endpoint );
            }
            data_copy = _tree.tree_to_list( data_source );
            meta_copy = $.extend( true, {}, meta );
            callback( data_copy, meta_copy );
        });
    };

    // TODO: add parents( count=inf ) to monkey
    that.get_top_parent = function ( endpoint ) {
        /* FUTURE CODE
        var parents = get_parents( endpoint );
        return parents.pop();
        */
        var node = db_tree.getNode( endpoint_id );

        if ( !node ) return undefined;

        while ( db_tree.parent( node ) !== db_tree.root() ) {
            node = db_tree.parent( node );
        }

        return db_tree.value( node );
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

    // Save downloaded data and save information about having full first level.
    function store_data( db_data, endpoint ) {
        var new_data_source = _tree.create_tree( db_data, 'id', 'parent' );
        data_sources[ endpoint ] = new_data_source;
        mark_parent_complete( endpoint );

        return new_data_source;
    }

    function store_meta_data( db_meta_data, endpoint ) {
        meta_sources[ endpoint ] = extracted_meta_data;
        
        return extracted_meta_data;
    }

    function has_db_tree() {
        return !!db_tree;
    }

    function get_db_tree() {
        return db_tree;
    }

    function save_db_tree( data ) {
        db_tree = _tree.create_tree( data, 'id', 'parent' );
    }

    return that;
}) ();
