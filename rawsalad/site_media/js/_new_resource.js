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
    };

    that.get_db_tree = function ( callback ) {
        // potentially --> magic here (depends on gui needs)
        _store.get_db_tree( function ( db_tree ) {
            var process_db_tree = function( db_tree ) {
                return db_tree.toList();
            };
            var processed_db_tree = process_db_tree( db_tree );
            
            callback( processed_db_tree );
        });
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
    }

    function add_sheet( col_id, data ) {
        var generate_sheet_id = function() {
            var act_id = next_sheet_id;
            next_sheet_id += 1;
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
            'type': _enum['STANDARD']
        };
        sheets[sheet_id] = new_sheet;

        return sheet_id;
    }

    function get_basic_sheet( col_id, type ) {
        var group;
        var type = type || _enum['STANDARD'];
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
                                        '_id', 'parent' );
        basic_sheet = {
            'name': first_sheet['name'],
            'type': type,
            'data': basic_data,
            'active_columns': active_columns
        };

        return basic_sheet;
    }

    function prepare_data_package_for_gui( sheet, sheet_id ) {
        var data_package;
        
        switch (sheet['type']) {
            case _enum['STANDARD']:
                data_package = prepare_standard_data_package_for_gui( sheet, sheet_id );
                break;
            case _enum['FILTERED']:
                data_package = prepare_filtered_data_package_for_gui( sheet, sheet_id );
                break;
            case _enum['SEARCHED']:
                data_package = prepare_searched_data_package_for_gui( sheet, sheet_id );
                break;
        };

        return data_package;
    }

    function prepare_standard_data_package_for_gui( sheet, sheet_id ) {
        var prepare_rows_for_gui = function( rows, columns ) {
            var update_level_map = function( id_level_map, row_id, parent_id ) {
                var level;
                if ( !!parent_id ) {
                    level = id_map[ parent_id ] + 1;
                } else {
                    level = 1;
                }
                id_map[ row_id ] = level;
            };
            var prepare_row = function( row, id_level_map ) {
                var new_row = {
                    '_id': row['_id'],
                    'parent': row['parent'],
                    'leaf': row['leaf'],
                    'is_open': row['state']['is_open']
                };
                if ( !!row['info'] ) {
                    new_row['info'] = row['info'];
                }
                if ( !!row['state']['selected'] ) {
                    new_row['selected'] = row['state']['selected'];
                }
                new_row['level'] = id_level_map[ new_row['_id'] ];
                new_row['data'] = columns.map( function( e ) {
                    var tmp;
                    tmp['column_key'] = e['key'];
                    tmp['column_type'] = e['type'];
                    tmp['click'] = (e['type'] === 'type' && !new_row['leaf']) ? 'click' : '';
                    tmp['content'] = format_value( row[ e['key'] ], type, format );
                    return tmp;
                });

                return new_row;
            };
            var new_rows = [];
            var id_level_map = {};
            var selected_rows = prepare_selection_description( rows );
            rows.forEach( function( row ) {
                update_level_map( id_level_map, row['_id'], row['parent'] );
                new_rows.push( prepare_row( row, id_level_map, selected_rows[ row['_id'] ] ) );
            });
            return new_rows;
        };
        var prepare_total_row = function( rows, columns ) {
            var total_row = [];
            var last_row = rows.pop();
            columns.forEach( function ( column ) {
                total_row.push( {
                    'data': format( last_row[ column['key'] ], column['type'], column['key'] ),
                    'column_type': column['type'],
                    'column_key': column['key']
                });
            });
            
            return total_row;
        };
        var columns_for_gui;
        var data_fot_gui;
        var total_row;
        var data = [];
        var data_package;
        
        columns_for_gui = sheet['columns'].map( function ( column ) {
            return {
                'key': column['key'],
                'label': column['label'],
                'type': column['type']
            }
        });
        data = sheet['data'].toList();
        data_package = {
            'id': sheet_id,
            'type': sheet['type'],
            'name': sheet['name'],
            'total': prepare_total_row( rows, columns_for_gui ),
            'columns': columns_for_gui,
            'rows': prepare_rows_for_gui( data, columns_for_gui )
        };

        return data_package;
    }

    function prepare_filtered_data_package_for_gui( sheet, sheet_id ) {
        return 'TODO';
    }

    function prepare_searched_data_package_for_gui( sheet, sheet_id ) {
        return 'TODO';
    }

    function format_value( value, type, format ) {
        if ( type !== 'string' ) {
            value = value + '';
        }
        return value;
    }

    function clean_data( data, columns, auxiliary_list ) {
        var clean_node = function( node, columns ) {
            var property;
            var new_node = {};
            
            columns.forEach( function ( column ) {
                new_node[ column['key'] ] = node[ column['key'] ];
            });
            auxiliary_list.forEach( function( aux_field ) {
                new_node[ aux_field ] = node[ aux_field ];
            });
            new_node['state'] = {
                'selected': '',
                'is_open': false
            };

            return new_node;
        };
        var new_data = monkey.createTree( [], '_id', 'parent' );

        data.forEach( function ( node ) {
            var new_node = clean_node( node, columns );
            new_data.insertNode( new_node );
        });

        return new_data;
    }

    return that;
}) ();
