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

    // meta_data setter
    // IN:
    // init_meta_data: [ {'description': '', 'idef': x, 'name': '', perspectives: []}, ... ]
    that.init_store = function ( init_meta_data ) {
        if ( !initiated ) {
            meta_data = monkey.createTree(init_meta_data, '_id', 'parent_id');
            initiated = true;
        }
    };

    // temporary
    that.meta_data = function ( value ) {
        meta_data = value;
    };

    that.get_db_tree = function ( callback ) {
        var respond = function ( data ) {
            var data = get_db_tree();
            callback( data );
        };

        if( has_db_tree() ) {
            respond();
        }
        else {
            _db.get_db_tree( function ( data ) {
                // TODO make the monkey eat the tree
                save_db_tree( data );
                respond();
            });
        }
    };
    
    that.get_children = function ( col_id, parent_id, callback ) {
        var data_source;
        var children;
        
        if ( has_data( col_id, parent_id ) ) {
            data_source = get_data_source( col_id );
            children = data_source.children( parent_id, true );
            callback( children );
        } else {
            _db.get_children( col_id, parent_id, function ( db_data ) {
                data_source = get_data_source( col_id );
                data_source.updateTree( db_data );
                children = data_source.children( parent_id, true );
                callback( children );
            });
        }
    };

    that.get_init_data = function ( col_id, callback ) {
        var data_source;
        var data;
        var meta;
        var data_package;

        if ( has_data( col_id ) ) {
            data_source = get_data_source( col_id );
            data = monkey.createTree( data_source.children( data_source.root() ), '_id', 'parent' );
            data_package = {
                'data': data.copy(),
                'meta': meta_data_sources[col_id]
            };
            //data = data_source.first_level();
            callback( data_package );
        } else {
            _db.get_init_data( col_id, function ( db_data ) {
                // TODO names of db obejct's fields changed
                //        rows --> data
                //        meta --> metadata
                //      change it where appropriate
                data_source = store_data( db_data['data'], col_id );
                meta = store_meta_data( db_data['meta'], col_id );
                data_package = {
                    'data': data_source.copy(),
                    'meta': meta
                };
                callback( data_package );
            });
        }
    };
    
    that.get_collection_name = function( col_id, callback ) {
        if ( !!has_data( col_id ) ) {
            callback( meta_data_sources[ col_id ]['name'] );
        } else {
            _db.get_init_data( col_id, function ( db_data ) {
                data_source = store_data( db_data['data'], col_id );
                meta = store_meta_data( db_data['meta'], col_id );
                data_package = {
                    'data': data_source.copy(),
                    'meta': meta
                };
                callback( meta['name'] );
            });
        }
    };


// P R I V A T E   I N T E R F A C E

    // data tree about data
    var db_tree;
    // initiated - is store initiated(meta_data downloaded)
    var initiated = false;
    // tree for each collection
    var data_sources = {};
    // information about complete children
    var complete_children = {};
    // contains meta data for each collection
    var meta_data_sources = {};

    function has_data( col_id, parent_id ) {
        if (parent_id !== undefined) {
            parent_id = '';
        }
        return !!data_sources[col_id] && has_all_children( col_id, parent_id );
    }
    
    function has_all_children( col_id, parent_id ) {
        return !!complete_children[col_id] && !!complete_children[col_id][parent_id];
    }
    
    function all_children_downloaded( col_id, parent_id ) {
        complete_children[col_id][parent_id] = true;
    }

    function get_data_source( col_id ) {
        return data_sources[col_id];
    }

    function store_data( db_data, col_id ) {
        var new_data_source = monkey.createTree( db_data, '_id', 'parent' );
        data_sources[col_id] = new_data_source;
        complete_children[col_id] = { '': true };

        return new_data_source;
    }

    function store_meta_data( db_meta_data, col_id ) {
        var extracted_meta_data = extract_meta_data( db_meta_data );

        meta_data_sources[col_id] = extracted_meta_data;
        return extracted_meta_data;
    }

    function extract_meta_data( db_meta_data, col_id ) {
        return {
            'name': db_meta_data['name'],
            'columns': db_meta_data['columns'],
            'aux': db_meta_data['aux']
        };
    }

    function has_db_tree() {
        return !!db_tree;
    }

    function get_db_tree() {
        // TODO: to copy or not to copy?
        return db_tree.copy();
    }

    function save_db_tree( data ) {
        db_tree = monkey.createTree( data, '_id', 'parent_id' );
    }

    return that;

}) ();

/*[
    {
        'data': [ {row_object} ],
        'meta': {
            'name': collection_name,
            'columns': { active_columns_objects },
            'aux': aux_list,
            'enpoint_id': end_id
        },
        'sheets': [
            {
                'type': enum,
                'name': 'sheet_name' || undefined,
                'columns': [ 'column_key', ...],
                'sheet_data': sheet type dependent data
            },
            ...
        ]
    },
    ...
]

sheet type dependent data:
a) standard:
    [ id1, id2, id3, ... ]
    lowest open nodes
b) filtered:
    [
        {
            'breadcrumb': 'breadcrumb',
            'rows': [ row1, row2, row3, ... ]
        }
    ]
c) search:
    {
        'query': 'query_string',
        'boxes': [
            {
                'rows': [
                    {
                      ...
                      'hit': [column_key, ...]
                    }
                ]
            }
        ]
    }*/