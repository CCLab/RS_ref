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
    that.get_db_tree = function ( callback ) {
        var respond = function () {
            // TODO: change function name
            var data = get_db_tree();
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
    // TODO: change name
    that.get_full_tree = function ( col_id, callback ) {
        if ( !has_data( col_id ) ) {
            return undefined;
        } else {
            return get_data_source[ col_id ].copy();
        }
    };

    // Download meta data and first level nodes of collection with id = col_id.
    that.get_init_data = function ( col_id, callback ) {
        var data_source;
        var data;
        var metadata;
        var data_package;

        if ( has_data( col_id ) ) {
            data_source = get_data_source( col_id );
            data = monkey.createTree( data_source.children( data_source.root(), true ), 'id', 'parent' );
            data_package = {
                // TODO: check nadmiarowe copies
                'data'    : data.copy(),
                'metadata': meta_data_sources[ col_id ]
            };
            callback( data_package );
        } else {
            _db.get_init_data( col_id, function ( db_data ) {
                // save data and meta data, return it in callback
                data_source = store_data( db_data['data'], col_id );
                metadata = store_meta_data( db_data['meta'], col_id );
                data_package = {
                    'data'    : data_source.copy(),
                    // TODO: copy
                    'metadata': metadata
                };
                callback( data_package );
            });
        }
    };

    // Get children of parent_id node from col_id collection.
    that.get_children = function ( col_id, parent_id, callback ) {
        var data_source;
        var children;

        // TODO: how to check if i have all top level children
        if ( has_data( col_id, parent_id ) ) {
            data_source = get_data_source( col_id );
            // TODO: interface it
            children = data_source.children( parent_id, true );
            callback( children );
        } else {
            _db.get_children( col_id, parent_id, function ( db_data ) {
                // Store is not sure if it has all children of parent_id,
                // downloads them and updates tree(inserting new nodes).
                data_source = get_data_source( col_id );
                // TODO: check execution time
                // TODO: update_data_source
                data_source.updateTree( db_data );
                // change name: mark_parent_complete
                all_children_downloaded( col_id, parent_id );
                children = data_source.children( parent_id, true );
                callback( children );
            });
        }
    };

    that.get_top_level = function ( col_id, callback ) {
        // TODO: __root__ is temporary here
        that.get_children( col_id, '__root__', callback );
    };

    that.get_collection_name = function( col_id, callback ) {
        var node;
        /*if ( !has_db_tree() ) {
            get_db_tree( );
        }*/

        node = db_tree.getNode( col_id );
        // TODO: no if
        return !!node['label'] ? node['label'] : node['name'];
    };

    that.get_columns = function( col_id ) {
        var meta_data;
        var columns;

        // TODO: remove assert
        _assert.is_true( !!meta_data_sources[col_id],
                         '_store:get_columns:no collection with given id');

        meta_data = get_meta_data_source( col_id );
        columns = meta_data['columns'];

        return columns;
    };

    that.get_search_count = function ( endpoints, query, callback ) {
        // TODO: get rid of it
        var names = endpoints.map( function ( endpoint_id ) {
            var node = get_db_tree().getNode( endpoint_id );

            return node['endpoint'];
        });

        _db.get_search_count( names, query, callback );
    };

    that.get_search_data = function ( endpoint_id, query, callback ) {
        var need_meta = !has_meta_data( endpoint_id );
        var node = db_tree.getNode( endpoint_id );
        var endpoint = node['endpoint'];


        _db.get_search_data( endpoint, query, need_meta, function ( db_data ) {
            data_source = get_data_source( endpoint_id );
            if ( need_meta ) {
                meta_data = store_meta_data( db_data['meta'], endpoint_id );
            } else {
                meta_data = get_meta_data_source( endpoint_id );
            }
            data_package = {
                'data'    : //data_source.copy(),
                'metadata': metadata
            };
            callback( data_package );
        });
    };

    // maybe add a new function to monkey? how in jquery
    that.get_top_parent = function ( endpoint_id ) {
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
    // TODO: change key to endpoint
    var data_sources = {};
    // information about complete children
    // TODO: unique ids in db, so cut one level
    var complete_children = {};
    // contains meta data for each collection
    // TODO: change key to endpoint
    var meta_data_sources = {};

    // Does store have children of parent_id(default root's id) in col_id collection.
    function has_data( col_id, parent_id ) {
        if ( parent_id === undefined ) {
            parent_id = '__root__';
        }
        return !!data_sources[ col_id ] && has_all_children( col_id, parent_id );
    }

    // Does store have all children of parent_id in col_id collection.
    function has_all_children( col_id, parent_id ) {
        return !!complete_children[ col_id ] && !!complete_children[ col_id ][ parent_id ];
    }

    // Saves information about having downloaded all children of parent_id node in
    // col_id collection.
    function all_children_downloaded( col_id, parent_id ) {
        if ( !complete_children[ col_id ] ) {
            complete_children[ col_id ] = {};
        }
        complete_children[ col_id ][ parent_id ] = true;
    }

    function get_data_source( col_id ) {
        return data_sources[ col_id ];
    }

    function has_meta_data( col_id ) {
        return !!meta_data_sources[ col_id ];
    }

    function get_meta_data_source( col_id ) {
        return meta_data_sources[ col_id ];
    }

    // Save downloaded data and save information about having full first level.
    function store_data( db_data, col_id ) {
        var new_data_source = monkey.createTree( db_data, 'id', 'parent' );
        data_sources[ col_id ] = new_data_source;
        all_children_downloaded( col_id, '__root__' );

        return new_data_source;
    }

    function store_meta_data( db_meta_data, col_id ) {
        var extracted_meta_data = extract_meta_data( db_meta_data );

        meta_data_sources[ col_id ] = extracted_meta_data;
        return extracted_meta_data;
    }

    // Returns important metadata from data downloaded by db.
    // TODO: remove
    function extract_meta_data( db_meta_data ) {
        return {
            'name': db_meta_data['name'],
            'columns': db_meta_data['columns']
        };
    }

    // TODO: reconsider this
    function has_db_tree() {
        return !!db_tree;
    }

    function get_db_tree() {
        return db_tree.copy();
    }

    function save_db_tree( data ) {
        db_tree = monkey.createTree( data, 'id', 'parent' );
    }

    return that;

}) ();
