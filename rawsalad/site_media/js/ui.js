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

var _ui = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};

    that.prepare_data_package = function( sheet, sheet_id, data ) {
        var data_package;
        
        switch ( sheet['type'] ) {
            case _enum['STANDARD']:
                data_package = prepare_standard_data_package( sheet, sheet_id, data );
                break;
            case _enum['FILTERED']:
                data_package = prepare_filtered_data_package( sheet, sheet_id );
                break;
            case _enum['SEARCHED']:
                data_package = prepare_searched_data_package( sheet, sheet_id );
                break;
            default:
                throw 'Bad sheet type';
        };

        return data_package;
    }
    
//  P R I V A T E   I N T E R F A C E
    
    // Prepare data in standard sheet for gui.
    function prepare_standard_data_package( sheet, sheet_id, data ) {
        // Used to generate gui row levels. If row does not have parent,
        // it's on first level, otherwise is one level lower.
        var create_level_map = function( sheet_data ) {
            var id_map = {};

            sheet_data.forEach( function ( row ) {
                if ( !row['parent'] && row['parent'] !== 0 ) {
                    id_map[ row['id'] ] = 1;
                } else {
                    id_map[ row['id'] ] = id_map[ row['parent'] ] + 1;
                }
            });

            return id_map;
        };
        var prepare_rows = function( rows, columns, id_level_map ) {
            // Returns row prepared for gui(columns data + state).
            var prepare_row = function( row, id_level_map ) {
                // insert standard values
                var new_row = {
                    'id'      : row['id'],
                    'parent'  : row['parent'],
                    'leaf'    : row['leaf'],
                    'is_open' : row['state']['is_open']
                };
                if ( !!row['aux']['info'] ) {
                    new_row['info'] = row['aux']['info'];
                }
                if ( !!row['state']['selected'] ) {
                    new_row['selected'] = row['state']['selected'];
                }
                new_row['level'] = id_level_map[ new_row['id'] ];

                // add data fields containing information to generate cells
                // in table for this row
                new_row['data'] = columns.map( function( e ) {
                    return {
                        'column_key'  : e['key'],
                        'column_type' : e['type'],
                        'click'       : (e['key'] === 'type' && !new_row['leaf']) ? 'click' : '',
                        'content'     : format_value( row['data'][ e['key'] ], e['type'], e['format'] )
                    };
                });

                return new_row;
            };
            var new_rows = [];

            // create array with prepared rows
            rows.forEach( function( row ) {
                new_rows.push( prepare_row( row, id_level_map ) );
            });

            return new_rows;
        };
        // Return total row(if there is no total row, returns undefined).
        var prepare_total_row = function( rows, columns ) {
            var total_row = [];
            var last_row = rows.pop();
            
            if ( last_row['data']['type'] !== 'Total' ) {
                rows.push( last_row );
                return undefined;
            }
            
            // push values to be showed in total row
            columns.forEach( function ( column ) {
                total_row.push( {
                    'data': format_value( last_row['data'][ column['key'] ], column['type'], column['key'] ),
                    'column_type': column['type'],
                    'column_key': column['key']
                });
            });

            return total_row;
        };
        var columns_for_gui;
        var total_row;
        var rows_for_gui;
        var data_package;
        var id_map;
        var full_data = _tree.tree_to_list( sheet['data'] );
        
        // columns description for gui
        columns_for_gui = get_columns_description( sheet['columns'] );
        total_row = prepare_total_row( data, columns_for_gui );
        id_map = create_level_map( full_data );
        rows_for_gui = prepare_rows( data, columns_for_gui, id_map );

        // object for gui
        data_package = {
            'group': sheet['group_id'],
            'id': sheet_id,
            'type': sheet['type'],
            'label': sheet['label'],
            'total': total_row,
            'columns': columns_for_gui,
            'rows': rows_for_gui
        };

        return data_package;
    }

    // Prepare data in filtered sheet for gui.
    function prepare_filtered_data_package( sheet, sheet_id ) {
        // Return row in gui-understandable form.
        var prepare_row = function( row, columns ) {
            // insert standard values
            var new_row = {
                'id' : row['id']
            };
            if ( !!row['aux']['info'] ) {
                new_row['info'] = row['aux']['info'];
            }

            // add data fields containing information to generate cells
            // in table for this row
            new_row['data'] = columns.map( function( e ) {
                return {
                    'column_key'  : e['key'],
                    'column_type' : e['type'],
                    'content'     : format_value( row['data'][ e['key'] ], e['type'], e['format'] )
                };
            });

            return new_row;
        };
        
        var columns_for_gui;
        var boxes = [];
        var box_ids = [];
        var box_obj = {};
        var boxes_count = 0;
        
        // columns description for gui
        columns_for_gui = get_columns_description( sheet['columns'] );
        
        _tree.tree_to_list( sheet['data'] )
             .filter( function ( node ) {
                 return _tree.is_filtered( sheet['data'], node['id'] );
             }).forEach( function ( node ) {
                 var box;
                 var box_id;
                 if ( !box_obj[ node['parent'] ] ) {
                     box = {
                         'columns'   : columns_for_gui,
                         'breadcrumb': get_breadcrumb( sheet['data'], node['id'] ),
                         'rows'      : []
                     };
                     boxes_count += 1;
                     box_id = node['parent'] || boxes_count;
                     box_obj[ box_id ] = box;
                     box_ids.push( box_id );
                 } else {
                    box = box_obj[ node['parent'] ];
                    box_id = node['parent'];
                 }
                 
                 box['rows'].push( prepare_row( node, columns_for_gui ) );
             });
             
        box_ids.forEach( function ( id ) {
            boxes.push( box_obj[ id ] );
        });

        return {
            'group'  : sheet['group_id'],
            'id'     : sheet_id,
            'type'   : sheet['type'],
            'label'  : sheet['label'],
            'boxes'  : boxes,
            'columns': columns_for_gui
        };
    }

    // Prepare data in searched sheet for gui.
    function prepare_searched_data_package( sheet, sheet_id ) {
        // Return row in gui-understandable form.
        var prepare_row = function( row, columns, hit_list ) {
            // insert standard values
            var new_row = {
                'id' : row['id'],
            };
            var hit_obj = {};
            
            if ( !!row['aux']['info'] ) {
                new_row['info'] = row['aux']['info'];
            }
            
            hit_list.forEach( function ( e ) {
                hit_obj[ e ] = true;
            });

            // add data fields containing information to generate cells
            // in table for this row
            new_row['data'] = columns.map( function( e ) {
                return {
                    'hit'         : !!hit_obj[ e['key'] ],
                    'column_key'  : e['key'],
                    'column_type' : e['type'],
                    'content'     : format_value( row['data'][ e['key'] ], e['type'], e['format'] )
                };
            });

            return new_row;
        };
        
        var columns_for_gui;
        var gui_boxes;
        
        // columns description for gui
        columns_for_gui = get_columns_description( sheet['columns'] );
        
        gui_boxes = sheet['boxes'].map( function ( box ) {
            var hit_ids = {};
            var gui_breadcrumb;
            var gui_context;
            var gui_rows;
            var parent_id;
            
            
            if ( box['breadcrumb'] ) {
                gui_breadcrumb = _tree.get_parents( sheet['data'], box['rows'][0]['id'] )
                                    .map( function ( node ) {
                                        return prepare_row( node, columns_for_gui, [] );
                                    });
            } else {
                gui_breadcrumb = get_breadcrumb( sheet['data'], box['rows'][0]['id'] );
            }
            if ( box['context'] ) {
                parent_id = _tree.get_parent_id( sheet['data'], box['rows'][0]['id'] );
                gui_rows = _tree.get_children_nodes( sheet['data'], parent_id )
                                .map( function ( node ) {
                                    return prepare_row( node, columns_for_gui, [] );
                                });
            } else {
                gui_rows = box['rows'].map( function ( row ) {
                    var node = _tree.get_node( sheet['data'], row['id'] );
                    hit_ids[ row['id'] ] = true;
                    return prepare_row( node, columns_for_gui, row['hits'] );
                });
            }
            
            return {
                'columns'   : columns_for_gui,
                'rows'      : gui_rows,
                'breadcrumb': gui_breadcrumb
            };
        });
        
        return {
            'group'  : sheet['group_id'],
            'id'     : sheet_id,
            'type'   : sheet['type'],
            'label'  : sheet['label'],
            'boxes'  : gui_boxes,
            'columns': columns_for_gui
        };
    }
    
    function get_columns_description( columns ) {
        return columns.map( function ( column ) {
            return {
                'key': column['key'],
                'label': column['label'],
                'type': column['type']
            };
        });
    }
    
    function get_parents_ids( tree, node_id ) {
        return _tree.get_parents( tree, node_id ).map( function ( node ) {
            return node['id'];
        });
    }
    
    function get_breadcrumb( tree, node_id ) {
        var parents_descr = _tree.get_parents( tree, node_id )
                                 .map( function ( node ) {
                                    return {
                                        'type': node['data']['type'],
                                        'name': node['data']['name']
                                    };
                                 });
        
        var breadcrumb = [];
        parents_descr.forEach( function ( pair ) {
            breadcrumb.push( pair['type'] + ' ' + pair['name'] );
        });
        
        return breadcrumb.join(' > ');
    }
    
    function format_value( value, type, format ) {
        if ( type !== 'string' ) {
            value = value + '';
        }
        return value;
    }

    return that;
}) ();
