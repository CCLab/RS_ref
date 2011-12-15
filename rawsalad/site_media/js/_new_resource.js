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

var _resource = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};
<<<<<<< HEAD
    
    that.get_top_level = function( col_id, callback ) {
        //if ( has_sheet( col_id ) ) {
        //    return_basic_data( col_id, callback );
        //} else {
        //    _store.get_init_data( col_id, function( data ) {
        //        var sheet_id = add_sheet( col_id, data );
        //        return_basic_data( sheet_id, callback );
        //    });
        //}
        
        _store.get_init_data( col_id, function( data ) {
            var sheet;
            var sheet_id;
            var gui_data;
            
            sheet_id = add_sheet( col_id, data );
            sheet = sheets[sheet_id];
            gui_data = prepare_data_for_gui( sheet, sheet_id );
            callback( gui_data );
        });
=======

    // get metadata about available datasets
    // OUT:
    // [ {'description': '', 'idef': x, 'name': '', perspectives: []}, ... ]
    that.get_meta_datasets = function() {
        var tree = _store.meta_datasets();
        return tree.children(tree.root());
    };

    that.get_meta_views = function( dataset_id ) {
        var tree = _store.meta_datasets();
        return tree.children( dataset_id );
    };

    // get children and pass them to callback
    that.get_children = function( parent_id, group_id, callback ) {
        var group_id = group_id || _store.get_active_group_index();
        _store.get_children( parent_id, group_id, callback );
    };

    that.get_init_data = function( dataset_id, view_id, issue, callback ) {
        var data = _store.get_data
    };

    that.convert_meta_data = function( meta_data ) {
        var rows;
        //dataset_rows = $.extend([], true, meta_data);
        meta_data.forEach( function ( dataset ) {
            var dataset_id = dataset['idef'];
            var rows = rows;
            dataset['perspectives'].forEach( function( view ) {
                var view_id = view['idef'];
                view['issues'].forEach( function( issue ) {
                    var rows = rows;
                    var meta_id = dataset_id + '-' + view_id + '-' + issue;
                    rows.push({'id': meta_id, 'description': issue});
                });
                meta_id = dataset_id + '-' + view_id;
                delete view['issues'];
                delete view['idef'];
                view['id'] = meta_id;
                rows.push(view);
            });
            meta_id = dataset_id;
            delete dataset['perspectives'];
            delete dataset['idef'];
            dataset['id'] = dataset_id;
            rows.push(dataset);
        });
    };

    that.get_top_level = function( col_id, callback ) {
        var processed_data;
        var gui_data;
        var new_sheet;

        if ( has_sheet( col_id ) ) {
            sheet = get_basic_sheet( col_id );
            gui_data = prepare_data_for_gui( sheet );
            callback(gui_data);
        } else {
            _store.get_init_data( col_id, function( data ) {
                processed_data = process_data( data );
                add_group( col_id, processed_data['meta']['columns'] );
                sheet = add_sheet( processed_data['data'], processed_data['meta']['name'], col_id );
                gui_data = prepare_data_for_gui( sheet );
                callback( gui_data );
            });
        }
>>>>>>> 22479fb028680fa8d64dde0bbaacdd0e27001e26
    };


    that.get_db_tree = function ( callback ) {
        // potentially --> magic here (depends on gui needs)
        _store.get_db_tree( callback );
    };


// P R I V A T E   I N T E R F A C E
    var sheets = {};
    var next_sheet_id = 10000;
    
    function has_sheet( col_id ) {
        var found_group;

        found_group = groups.filter( function ( group ) {
            return group['id'] === col_id;
        });

        _assert.assert( (found_group.length === 1 || found_group.length === 0),
                        '_resource:has_sheet:bad_length' );
        return found_group.length > 0;
    };
    
    function add_sheet( col_id, data ) {
        var generate_sheet_id = function() {
            var act_id = next_sheet_id;
            act_id += 1;
            return next_sheet_id;
        };
        var new_sheet;
        var active_columns;
        var cleaned_data;
        var sheet_id = generate_sheet_id();
        var name = data['meta']['name'];
        
        active_columns = data['meta']['columns'].filter( function ( column ) {
            return !!column['basic'];
        });
        cleaned_data = clean_data( data['data'], active_columns );
        
        new_sheet = {
            'endpoint': col_id,
            'data': cleaned_data,
            'name': name,
            'columns': active_columns,
            'type': 'STANDARD'
        };
        sheets[sheet_id] = new_sheet;
        
        return sheet_id;
    };
    
    function get_basic_sheet( col_id, type ) {
        var group;
        var type = type || 'STANDARD';
        var first_sheet;
        var basic_sheet;
        var basic_data;

        group = get_group( col_id );
        active_columns = group['columns'].filter( function ( column ) {
            return !!column['basic'];
        });

        _assert.is_true( group['sheets'].length > 0,
                         '_resource:get_basic_sheet:0 sheets in group');
        first_sheet = group['sheets'][0];

        basic_data = monkey.createTree( first_sheet['data'].children( first_sheet['data'].root() ), // CHANGE
                                        'idef_sort' );
        basic_sheet = {
            'name': first_sheet['name'],
            'type': type,
            'data': basic_data,
            'active_columns': active_columns
        };

        return basic_sheet;
    };
    
    function prepare_data_for_gui( sheet, sheet_id ) {
        var data = [];
        var data_package;
        
        data = sheet['data'].toList();
        data_package = {
            'type': sheet['type'],
            'data': data,
            'columns': sheet['columns'],
            'id': sheet_id,
            'name': sheet['name']
        };

        return data_package;
    };
    
    function clean_data( data, columns ) {
        var clean_node = function( node, columns ) {
            var property;
            var new_node = {};
            
            new_node['idef_sort'] = node['idef_sort'];
            
            columns.forEach( function ( column ) {
                new_node[ column['key'] ] = node[ column['key'] ];
            });
            
            return new_node;
        };
        var new_data = monkey.createTree( [], 'idef_sort' );
        
        data.forEach( function ( node ) {
            var new_node = clean_node( node, columns );
            new_data.insertNode( new_node );
        });
        
        return new_data;
    };

    return that;
}) ();
