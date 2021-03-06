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
                data_package = prepare_searched_data_package( sheet, sheet_id, data );
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
            var prepare_row = function( row, id_level_map, nonempty_parents ) {
                // insert standard values
                var nonempty_parent = nonempty_parents[ row['parent'] ] || row['parent'];
                var new_row = {
                    'id'      : row['id'],
                    //'parent'  : row['parent'],
                    'parent'  : nonempty_parent,
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

            var nonempty_parents = {};

            // remove Empty nodes and create array with the rest prepared rows
            return rows.filter( function( row ) {
                        if ( row['data']['type'] === 'Empty' ) {
                            nonempty_parents[ row['id'] ] = nonempty_parents[ row['parent'] ] || row['parent'];
                        }
                        return row['data']['type'] !== 'Empty';
                    }).map( function( row ) {
                        return prepare_row( row, id_level_map, nonempty_parents );
                    });
        };
        // Return total row(if there is no total row, returns undefined).
        var prepare_total_row = function( total_row, columns ) {
            return columns.map( function ( column ) {
                return {
                    'data': format_value( total_row['data'][ column['key'] ], column['type'], column['format'] ),
                    'column_type': column['type'],
                    'column_key': column['key']
                };
            });
        };
        var columns_for_gui;
        var total_row;
        var rows_for_gui;
        var data_package;
        var id_map;
        var full_data = _tree.tree_to_list( sheet['data'] );

        // columns description for gui
        columns_for_gui = get_columns_description( sheet['columns'] );
        total_row = prepare_total_row( sheet['total'], columns_for_gui );
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
                 return _tree.is_filtered( sheet['data'], node['id'] ) &&
                        node['data']['type'] !== 'Empty';
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
    function prepare_searched_data_package( sheet, sheet_id, box ) {
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

        if ( !!box ) {
            gui_boxes = prepare_box( sheet, box, columns_for_gui );
        } else {
            gui_boxes = sheet['boxes'].map( function ( box ) {
                return prepare_box( sheet, box, columns_for_gui );
            });
        }

        return {
            'group'  : sheet['group_id'],
            'id'     : sheet_id,
            'type'   : sheet['type'],
            'label'  : sheet['label'],
            'boxes'  : gui_boxes,
            'columns': columns_for_gui
        };
    }

    function prepare_box( sheet, box, columns_for_gui ) {
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

        var hit_ids = {};
        var gui_breadcrumb;
        var gui_context;
        var gui_rows;
        var parent_id;
        var hits_for_id = {};
        var first_row;
        var has_parent;
        var has_context;
        var context_visible;
        var siblings_length;
        var hit_length;

        box['rows'].forEach( function ( row ) {
            hits_for_id[ row['id'] ] = row['hits'];
        });
        first_row = box['rows'][0];
        parent_id = _tree.get_parent_id( sheet['data'], first_row['id'] );

        if ( box['breadcrumb'] ) {
            gui_breadcrumb = _tree
                .get_nonempty_parents( sheet['data'], first_row['id'] )
                .map( function ( node ) {
                    var node_hits = get_parent_hits( sheet['boxes'], node['id'] );
                    return prepare_row( node, columns_for_gui, node_hits );
                });
        } else {
            gui_breadcrumb = get_breadcrumb( sheet['data'], first_row['id'] );
        }
        if ( box['context'] ) {
            gui_rows = _tree
                .get_nonempty_children_nodes( sheet['data'], parent_id )
                .filter( function ( node ) {
                    return node['data']['type'] !== 'Empty';
                })
                .map( function ( node ) {
                    var node_hits = hits_for_id[ node['id'] ] || [];
                    return prepare_row( node, columns_for_gui, node_hits );
                });
        } else {
            gui_rows = box['rows'].map( function ( row ) {
                var node = _tree.get_node( sheet['data'], row['id'] );
                hit_ids[ row['id'] ] = true;
                return prepare_row( node, columns_for_gui, row['hits'] );
            });
        }

        has_parent = !!_tree.get_parent( sheet['data'], first_row['id'] );
        hit_length = box['rows'].length;
        siblings_length = _tree.get_children_number( sheet['data'], parent_id );
        has_context = siblings_length > hit_length;
        empty_context = box['context'] && !has_context;
        context_visible = has_parent;

        return {
            'columns'          : columns_for_gui,
            'rows'             : gui_rows,
            'breadcrumb'       : gui_breadcrumb,
            'breadcrumb_showed': box['breadcrumb'],
            'context_showed'   : box['context'],
            'has_parent'       : has_parent,
            'has_context'      : has_context,
            'empty_context'    : empty_context,
            'context_visible'  : context_visible
        };
    }

    function get_parent_hits( boxes, id ) {
        var hit_list = [];
        boxes.forEach( function ( box ) {
            box['rows'].forEach( function ( row ) {
                if ( row['id'] === id ) {
                    hit_list = hit_list.concat( row['hits'] );
                }
            });
        });

        return hit_list;
    }

    function get_columns_description( columns ) {
        return columns.map( function ( column ) {
            return {
                'key': column['key'],
                'label': column['label'],
                'type': column['type'],
                'format': column['format']
            };
        });
    }

    function get_parents_ids( tree, node_id ) {
        return _tree.get_parents( tree, node_id ).map( function ( node ) {
            return node['id'];
        });
    }

    function get_breadcrumb( tree, node_id ) {
        var parents_descr = _tree.get_nonempty_parents( tree, node_id )
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

    function format_value( value, type, format, point, space ) {
        if ( type !== 'string' ) {
            var prefix;
            var int_part;
            var float_part;
            point = point || '.';
            format = format || "0.00";
            if(value < 0) {
                prefix = '-';
                value *= -1;
            }
            else {
                prefix = '';
            }
            digits  = value.toString().split('.');
            formats = format.split('.');
            int_part = _showFormatedInt(digits.shift(), formats.shift(), space); 
            flt_part = formats != ""? _showFormatedPart(digits.shift(), formats.shift(), point) : "";

            value = prefix + int_part + flt_part;
        }
        return value;
        
        function _showFormatedInt(num, format, space) {
            var i;
            var group_by;
            var min_size = Array.prototype.filter.call(format, isZero).length;
            space = space || ' ';

            while(min_size > num.length) {
                num = '0' + num;
            }

            if( format.search(' ') != -1 ){
                group_by = format.split(' ').pop().length;
                num = Array.prototype.reduceRight.call(num, function (acc, e, i, r) {
                    // hack for JS reduceRight indexing
                    var step = num.length - (i + 1);

                    if(step % group_by === 0 && step !== 0) {
                        return e + space + acc;
                    }
                    else {
                        return e + acc;
                    }
                });
            }

            return num;
        }
          
        function _showFormatedPart(num, format, point) {
            var min_size = Array.prototype.filter.call(format, isZero).length;
            num = num || '';

            while(min_size > num.length) {
                num += '0';
            }
            number = num.slice(0, format.length);
            return number != ""?point+number:"";
        }
          
        function isZero(element, index, array) {
              return element === '0';
        }
    }
    
    return that;
}) ();