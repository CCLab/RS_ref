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

    // Get db tree and return it as a list.
    that.get_db_tree = function ( callback ) {
        _store.get_db_tree( function ( db_tree ) {
            var process_db_tree = function( db_tree ) {
                return db_tree.toList();
            };
            var processed_db_tree = process_db_tree( db_tree );

            callback( processed_db_tree );
        });
    };


    // Get top level data from store and prepare it for
    // gui-understandable form.
    that.get_top_level = function ( col_id, callback ) {
        _store.get_init_data( col_id, function( data ) {
            var sheet_id;
            var sheet;
            var gui_data;

            sheet = create_sheet( col_id, data );
            sheet_id = add_sheet( sheet );
            gui_data = prepare_data_package_for_gui( sheet_id );

            callback( gui_data );
        });
    };

    // Get children of row_id row from sheet_id sheet.
    that.get_children = function ( sheet_id, row_id, callback ) {
        var children;
        var sheet = sheets[ sheet_id ];
        var endpoint_id = sheet['endpoint_id'];

        if ( !!sheet['data'].children( row_id ).length ) {
            children = sheet['data'].children( row_id, true );
            callback( children );
        } else {
            _store.get_children( endpoint_id, row_id, function( data ) {
                var cleaned_data;
                var gui_data;

                // Remove unnecessary fields(not present in columns list) from children
                // and update tree.
                cleaned_data = clean_data( data, sheet['columns'] );
                sheet['data'].updateTree( cleaned_data );

                // Prepare children in gui-understandable form.
                children = sheet['data'].children( row_id, true );
                gui_data = prepare_data_package_for_gui( sheet_id, children );

                callback( gui_data );
            });
        }
    };

    // Remove children of node_id node.
    that.remove_child = function ( sheet_id, node_id ) {
        var sheet;
        var children;
        var children_ids;

        sheet = sheets[sheet_id];
        children = sheet['data'].children( node_id, true);
        children_ids = children.map( function ( node ) {
            return node['id'];
        });

        children_ids.forEach( function ( id ) {
            sheet['data'].removeNode( id );
        });
    };



    that.row_selected = function ( sheet_id, new_row_id, old_row_id ) {
        // selected row get 'selected' attribute, his descdendants 'inside'
        // attribute, next row after his last descendant 'after' attribute
        var set_selection = function ( tree, root_id, selected, inside, after ) {
            var subtree_root;
            var act_node;

            subtree_root = data_tree.getNode( root_id );
            subtree_root['state']['selected'] = selected;
            act_node = data_tree.next( subtree_root );
            while ( !!act_node && data_tree.isAncestor( subtree_root, act_node ) ) {
                subtree_root['state']['selected'] = inside;
                act_node = data_tree.next( act_node );
            }
            if ( !!act_node ) {
                act_node['state']['selected'] = after;
            }
        };
        var sheet;
        var data_tree;

        sheet = sheets[sheet_id];
        data_tree = sheet['data'];

        // if there was no selected row
        if ( old_row_id !== undefined ) {
            set_selection( data_tree, old_row_id, '', '', '' );
        }
        set_selection( data_tree, new_row_id, 'selected', 'in-selected', 'after-selected' );
    };



    that.all_columns = function ( sheet_id, callback ) {
        var sheet;
        var full_columns_description;
        var selected_columns;
        var columns;

        sheet = sheets[sheet_id];

        selected_columns = {};
        sheet['columns'].forEach( function ( column ) {
            selected_columns[ column['key'] ] = true;
        });
        full_columns_description = _store.get_columns( sheet['endpoint_id'] );


        columns = full_columns_description.map( function ( column ) {
            return {
                'key': column['key'],
                'label': column['label'],
                'selected': !!selected_columns[ column['key'] ]
            };
        });

        return columns;
    };

    // Update columns in sheet. Return sheet data with new columns.
    that.show_with_columns = function ( sheet_id, columns, callback ) {
        var selected_columns;
        var selected_column_keys;
        var all_columns;
        var sheet;
        var full_tree;
        var cleaned_full_data;
        var old_tree;
        var new_tree;

        // Get selected columns description.
        selected_column_keys = {};
        selected_columns = columns.forEach( function ( column ) {
            if ( column['selected'] ) {
                selected_column_keys[ column['key'] ] = true;
            }
        });
        all_columns = that.all_columns( sheet_id );
        selected_columns = all_columns.filter( function ( column ) {
            return !!selected_column_keys[ column['key'] ];
        });

        // Update columns in sheet.
        sheet = sheets[sheet_id];
        sheet['columns'] = selected_columns;

        // Get list of all nodes with needed columns only
        full_tree = _store.get_full_tree( sheet['endpoint_id'] );
        cleaned_full_data = clean_data( full_tree.toList(), sheet['columns'] );

        new_tree = monkey.createTree( [], 'id', 'parent' );
        old_tree = sheet['data'];
        // Insert to new tree cleaned nodes(only those that were in old tree)
        cleaned_full_data.forEach( function ( node ) {
            if ( !!old_tree.getNode( node['id'] ) ) {
                new_tree.insertNode( node );
            }
        });

        // Update tree
        sheet['data'] = new_tree;

        that.get_sheet( sheet_id, callback );
    };


    // Clean sheet so that it contains only top level data.
    that.clean_table = function ( sheet_id, callback ) {
        var sheet;

        sheet = sheets[sheet_id];

        _store.get_top_level( sheet['endpoint_id'], function ( data ) {
            var cleaned_data = clean_data( data, sheet['columns'] );

            sheet['data'] = monkey.createTree( cleaned_data, 'id', 'parent' );

            that.get_sheet( sheet_id, callback );
        });
    };



    that.change_name = function ( sheet_id, new_name, callback ) {
        var sheet = sheets[sheet_id];

        sheet['name'] = new_name;

        // for future possible implementations
        if( !!callback ) {
            callback();
        }
    };

    // Get endpoint name(name from store).
    that.get_end_name = function ( end_id, callback ) {
        /*_store.get_collection_name( end_id, function ( name ) {
            callback( { 'name': name } );
        });*/
        return {
            'name': _store.get_collection_name( end_id )
        };
    };

    // Get names of sheets and sort them in order: ( group_id, sheet_id ).
    that.get_sheets_names = function ( callback ){
        var sheet_id;
        var sheet;
        var sheet_descr;
        var sheets_names = [];
        var sorted_sheets_names;

        for ( sheet_id in sheets ) {
            if ( sheets.hasOwnProperty( sheet_id ) ) {
                sheet = sheets[ sheet_id ];
                sheet_descr = {
                    'name': sheet['name'],
                    'sheet_id': parseInt(sheet_id),
                    'group_id': sheet['group_id'],
                    'end_id': sheet['endpoint_id']
                };
                sheets_names.push( sheet_descr );
            }
        }

        sorted_sheets_names = sheets_names.sort( function( s1, s2 ) {
            if ( s1['group_id'] === s2['group_id'] ) {
                return s1['sheet_id'] - s2['sheet_id'];
            }
            else {
                return s1['group_id'] - s2['group_id'];
            }
        });

        callback( { 'sheets': sorted_sheets_names } );
    };

    that.get_sheet_name = function ( sheet_id, callback ) {
        var sheet = sheets[ sheet_id ];

        callback( { 'name': sheet['name'] } );
    };



    that.get_info = function ( sheet_id, row_id, callback ) {
        var sheet;
        var row;
        var info;

        sheet = sheets[sheet_id];
        row = sheet['data'].getNode( row_id );
        info = row['aux']['info'];

        return info;
    };



    that.sortable_columns = function ( sheet_id, callback ) {
        var sheet;
        var sortable_columns;

        sheet = sheets[sheet_id];
        sortable_columns = sheet['columns'].filter( function ( column ) {
            return !!column['processable'];
        }).map( function ( column ) {
            return {
                'label': column['label'],
                'key': column['key']
            };
        });

        callback( sortable_columns );
    };

    // Sort sheet(in specified order) and return it.
    that.sort = function ( sheet_id, order, callback ) {
        // TODO
        //  ||
        //  \/
        var query_to_function = function ( query ) {
            var fun = function( elem1, elem2 ) {
                return elem1 - elem2
            };

            return fun;
        };
        var sheet;
        var sorted_tree;
        var sort_fun;

        sheet = sheets[sheet_id];
        sort_fun = query_to_function( query );
        sorted_tree = sheet['data'].sort( sort_fun );
        sheet['data'] = sorted_tree;

        that.get_sheet( sheet_id, callback );
    };

    // Return gui-understandable data from sheet_id sheet.
    that.get_sheet = function ( sheet_id, callback ) {
        var sheet;
        var gui_data;

        sheet = sheets['sheet_id'];
        gui_data = prepare_data_package_for_gui( sheet_id );

        callback( gui_data );
    };


    that.close_sheet = function ( sheet_id, callback ){
        delete sheets[ sheet_id ];
        if( !!callback ) {
            callback();
        }
    };

    that.copy_sheet = function ( sheet_id, callback ) {
        var sheet;
        var copied_sheet;
        var copied_sheet_id;
        var sheet_descr;

        sheet = sheets[sheet_id];
        copied_sheet = $.extend( true, {}, sheet );
        copied_sheet_id = add_sheet( copied_sheet );

        sheet_descr = {
            'name': copied_sheet['name'],
            'sheet_id': copied_sheet_id,
            'group_id': copied_sheet['group_id'],
            'end_id': copied_sheet['endpoint_id']
        };

        callback( sheet_descr );
    };
    
    that.get_search_count = function ( endpoints_list, query, callback ) {
        _store.get_search_count( endpoints_list, query, function ( data ) {
            var gui_results = {
                'query': query,
                'results': []
            };
            var topparent_groups = {};
            
            data.forEach( function( result ) {
                var topparent;
                var end_id = result['tree_id'];
                var group = topparent_groups[ end_id ];
                
                if ( !group ) {
                    topparent = _store.get_topparent( end_id )['name'];
                    group = {
                        'dbtree_topparent_name': topparent,
                        'data': []
                    };
                    gui_results['results'].push( group );
                    topparent_groups[ end_id ] = group;
                }
                group['data'].push({
                    'endpoint_id': end_id,
                    'endpoint_name': that.get_end_name( end_id )['name'],
                    'found_count': result['count']
                });
            });
            
            callback( gui_results );
        });
    };
    
    that.get_search_data = function ( endpoint_id, query, callback ) {
        _store.get_search_data( endpoint_id, query, function ( data ) {
            /*{
                sheet_id : int,
                name   : str,
                type   : enum.SEARCH,
                query  : str,
                boxes  : [
                    {
                        parents : str || list,
                        columns : list,
                        rows  : [
                            {
                                ...
                                hit: column_key
                            },
                            ...
                        ]
                    }
                ]
            }*/
            callback( data );
        });
    };


// P R I V A T E   I N T E R F A C E
    var sheets = {};
    var next_sheet_id = 10000;

    // Return group id assigned to endpoint_id endpoint.
    // If there is no group with data from this endpoint, next
    // group id will be returned.
    function get_group_id( endpoint_id ) {
        var sheet_id;
        var sheet;
        var group_id;
        var max_group_id;
        var group_found = false;

        max_group_id = -1;
        for ( sheet_id in sheets ) {
            if ( sheets.hasOwnProperty( sheet_id ) ) {
                sheet = sheets[sheet_id];
                // group with this endpoint is found
                if ( sheet['endpoint_id'] === endpoint_id ) {
                    group_found = true;
                    group_id = sheet['group_id'];
                    break;
                } else {
                    if ( sheet['group_id'] > max_group_id ) {
                        max_group_id = sheet['group_id'];
                    }
                }
            }
        }

        if ( !group_found ) {
            group_id = max_group_id + 1;
        }

        return group_id;
    }

    // Create new sheet from data.
    function create_sheet( col_id, data ) {
        var new_sheet;
        var active_columns;
        var cleaned_data;
        var cleaned_tree_data;
        var name = data['metadata']['name'];
        var group_id;

        active_columns = data['metadata']['columns'].filter( function ( column ) {
            return !!column['basic'];
        });

        // Remove unnecessary columns and inserts cleaned data into tree.
        cleaned_data = clean_data( data['data'].toList(), active_columns );
        cleaned_tree_data = monkey.createTree( cleaned_data, 'id', 'parent' );

        group_id = get_group_id( col_id );

        new_sheet = {
            'group_id': group_id,
            'endpoint_id': col_id,
            'data': cleaned_tree_data,
            'name': name,
            'columns': active_columns,
            'type': _enum['STANDARD']
        };

        return new_sheet;
    }

    // Add a new sheet and returns its id.
    function add_sheet( new_sheet ) {
        var generate_sheet_id = function() {
            var new_id = next_sheet_id;
            next_sheet_id += 1;
            return new_id;
        };
        var sheet_id = generate_sheet_id();

        sheets[sheet_id] = new_sheet;

        return sheet_id;
    }

    // Prepare data from sheet_id sheet.
    function prepare_data_package_for_gui( sheet_id, data ) {
        var data_package;

        switch ( sheets[sheet_id]['type'] ) {
            case _enum['STANDARD']:
                data_package = prepare_standard_data_package_for_gui( sheet_id, data );
                break;
            case _enum['FILTERED']:
                data_package = prepare_filtered_data_package_for_gui( sheet_id, data );
                break;
            case _enum['SEARCHED']:
                data_package = prepare_searched_data_package_for_gui( sheet_id, data );
                break;
        };

        return data_package;
    }

    // Prepare data for standard sheet.
    function prepare_standard_data_package_for_gui( sheet_id, data ) {
        // Used to generate gui row levels. If row does not have parent,
        // it's on first level, otherwise is one level lower.
        var create_level_map = function( sheet_id ) {
            var id_map = {};
            var data = sheets[sheet_id]['data'].toList();
            
            data.forEach( function ( row ) {
                if ( !row['parent'] && row['parent'] !== 0 ) {
                    id_map[ row['id'] ] = 1;
                } else {
                    id_map[ row['id'] ] = id_map[ row['parent'] ] + 1;
                }
            });
            
            return id_map;
        };
        var prepare_rows_for_gui = function( rows, columns, id_level_map ) {
            // Returns row prepared for gui(columns data + state).
            var prepare_row = function( row, id_level_map ) {
                var new_row = {
                    // SEND id not _id
                    '_id'      : row['id'],
                    'parent'  : row['parent'],
                    'leaf'    : row['leaf'],
                    'is_open' : row['state']['is_open']
                };
                if ( !!row['aux']['info'] ) {
                    new_row['aux']['info'] = row['aux']['info'];
                }
                if ( !!row['state']['selected'] ) {
                    new_row['selected'] = row['state']['selected'];
                }
                new_row['level'] = id_level_map[ new_row['_id'] ];

                // data field contains information to generate cells in table
                // for this row
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

            // create array with gui prepared rows
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
            columns.forEach( function ( column ) {
                total_row.push( {
                    'data': format_value( last_row['data'][ column['key'] ], column['type'], column['key'] ),
                    'column_type': column['type'],
                    'column_key': column['key']
                });
            });

            return total_row;
        };
        var sheet;
        var columns_for_gui;
        var data_fot_gui;
        var total_row;
        var data = data || [];
        var total_row;
        var rows_for_gui;
        var data_package;
        var id_map;

        sheet = sheets[sheet_id];

        columns_for_gui = sheet['columns'].map( function ( column ) {
            return {
                'key': column['key'],
                'label': column['label'],
                'type': column['type']
            };
        });

        // if data to prepare was not passed, use full tree from sheet
        if ( !data.length ) {
            data = sheet['data'].toList();
        }
        total_row = prepare_total_row( data, columns_for_gui );
        id_map = create_level_map( sheet_id );
        rows_for_gui = prepare_rows_for_gui( data, columns_for_gui, id_map );

        // object for gui
        data_package = {
            'group': sheet['group_id'],
            'id': sheet_id,
            'type': sheet['type'],
            'name': sheet['name'],
            'total': total_row,
            'columns': columns_for_gui,
            'rows': rows_for_gui
        };

        return data_package;
    }

    function prepare_filtered_data_package_for_gui( sheet_id, data ) {
        return 'TODO';
    }

    function prepare_searched_data_package_for_gui( sheet_id, data ) {
        return 'TODO';
    }

    function format_value( value, type, format ) {
        if ( type !== 'string' ) {
            value = value + '';
        }
        return value;
    }

    // Return data that contains columns that are in columns list
    function clean_data( data, columns ) {
        var clean_node = function( node, columns ) {
            var property;
            var new_node = {
                'aux': {},
                'data': {}
            };

            new_node['id'] = node['id'];
            new_node['parent'] = node['parent'];
            ///////////////////////////////////////////////////
            // DELETE IT ASAP
            ///////////////////////////////////////////////////
            new_node['leaf'] = false;
            ///////////////////////////////////////////////////
            
            for ( property in node['aux'] ) {
                if ( node['aux'].hasOwnProperty( property )) {
                    new_node['aux'][ property ] = node[ property ];
                }
            }
            columns.forEach( function ( column ) {
                new_node['data'][ column['key'] ] = node['data'][ column['key'] ];
            });

            new_node['state'] = {
                'selected': '',
                'is_open': false
            };

            return new_node;
        };

        var cleaned_data = data.map( function( node ) {
            return clean_node( node, columns );
        });
        
        return cleaned_data;
    }

    return that;
}) ();
