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
        _store.get_collections_list( function ( collections ) {
            callback( collections );
        });
    };

    that.get_top_levels = function ( endpoints, callbacks ) {
        get_many( endpoints, that.get_top_level, callbacks );
    };

    // Get top level data from store and prepare it for
    // gui-understandable form.
    that.get_top_level = function ( endpoint, callback ) {
        _store.get_init_data( endpoint, function( data, meta ) {
            var sheet_id;
            var sheet;
            var cleaned_data;
            var gui_data;

            cleaned_data = clean_data( data, meta['columns'] )
            sheet = create_sheet( endpoint, cleaned_data, meta );
            sheet_id = add_sheet( sheet );
            gui_data = prepare_table_data( sheet_id );

            callback( gui_data );
        });
    };

    // Get children of parent_id row from sheet_id sheet.
    that.get_children = function ( sheet_id, parent_id, callback ) {
        var respond = function() {
            var gui_data;
            var children = _tree.get_children_nodes( sheet['data'], parent_id );

            gui_data = prepare_table_data( sheet_id, children );
            callback( gui_data );
        };
        var sheet = get_sheet( sheet_id );

        if ( !!_tree.get_children_number( sheet['data'], parent_id ) ) {
            respond();
        } else {
            _store.get_children( sheet['endpoint'], parent_id, function( data ) {
                var cleaned_data;

                // Remove unnecessary fields(not present in columns list) from children
                // and update tree.
                cleaned_data = clean_data( data, sheet['columns'] )
                _tree.update_tree( sheet['data'], cleaned_data );
                if ( !!sheet['any_selected'] ) {
                    reset_selection( sheet_id );
                }

                respond();
            });
        }
    };

    // Remove children of node_id node.
    that.remove_children = function ( sheet_id, parent_id ) {
        var sheet;
        var children;

        sheet = get_sheet( sheet_id );
        children = _tree.get_children_nodes( sheet['data'], parent_id );
        children.forEach( function ( node ) {
            _tree.remove_node( sheet['data'], node['id'] );
        });
    };



    that.row_selected = function ( sheet_id, selected_id, prev_selected_id ) {

        var sheet = get_sheet( sheet_id );

        // if there was a selected row
        if ( prev_selected_id !== undefined ) {
            // if selected_id is not a previous one, which would be deselection
            if ( prev_selected_id !== selected_id) {
                set_selection( sheet_id, prev_selected_id, 'dim' );
                set_selection( sheet_id, selected_id, 'selected' );
                sheet['any_selected'] = true;
                reset_selection( sheet_id );
            } else {
                // if a row is deselected
                set_selection( sheet_id, prev_selected_id, undefined );
                sheet['any_selected'] = false;
                reset_selection( sheet_id );
            }
        } else {
            set_selection( sheet_id, selected_id, 'selected' );
            sheet['any_selected'] = true;
            reset_selection( sheet_id );
        }

    };



    that.all_columns = function ( sheet_id, callback ) {
        var sheet;
        var full_columns_list;
        var selected_columns;
        var columns;

        sheet = get_sheet( sheet_id );

        selected_columns = {};
        sheet['columns'].forEach( function ( column ) {
            selected_columns[ column['key'] ] = true;
        });

        full_columns_list = _store.get_columns( sheet['endpoint'] );

        columns = full_columns_list.map( function ( column ) {
            return {
                'key': column['key'],
                'label': column['label'],
                'selected': !!selected_columns[ column['key'] ]
            };
        });

        callback( columns );
    };

    // Update columns in sheet. Return sheet data with new columns.
    that.show_with_columns = function ( sheet_id, columns, callback ) {
        var selected_columns;
        var selected_column_keys;
        var all_columns;
        var sheet;
        var full_collection;
        var cleaned_full_data;
        var old_tree;
        var new_tree;

        // Get selected columns description.
        selected_column_keys = {};
        columns.forEach( function ( column ) {
            if ( column['selected'] ) {
                selected_column_keys[ column['key'] ] = true;
            }
        });
        all_columns = that.all_columns( sheet_id );
        selected_columns = all_columns.filter( function ( column ) {
            return !!selected_column_keys[ column['key'] ];
        });

        // Update columns in sheet.
        sheet = get_sheet( sheet_id );
        sheet['columns'] = selected_columns;

        // Get list of all nodes with needed columns only
        full_collection = _store.get_collection_data( sheet['endpoint'] );
        cleaned_full_data = clean_data( full_collection, sheet['columns'] );

        new_tree = _tree.create_tree( [], 'id', 'parent' );
        old_tree = sheet['data'];
        // Insert to new tree cleaned nodes(only those that were in old tree)
        cleaned_full_data.forEach( function ( node ) {
            if ( _tree.has_node( old_tree, node['id'] ) ) {
                _tree.insert_node( new_tree, node );
            }
        });

        // Update tree
        sheet['data'] = new_tree;
        if ( !!sheet['any_selected'] ) {
            reset_selection( sheet_id, true, find_selected_row( old_tree ) );
        }

        that.get_sheet_data( sheet_id, callback );
    };


    // Clean sheet so that it contains only top level data.
    that.clean_table = function ( sheet_id, callback ) {
        var sheet = get_sheet( sheet_id );

        // first parameter is endpoint, not endpoint id
        _store.get_top_level( sheet['endpoint'], function ( data ) {
            var cleaned_data = clean_data( data, sheet['columns'] );

            sheet['data'] = _tree.create_tree( cleaned_data, 'id', 'parent' );

            that.get_sheet_data( sheet_id, callback );
        });
    };



    that.change_name = function ( sheet_id, new_name, callback ) {
        var sheet = get_sheet( sheet_id );

        sheet['label'] = new_name;

        // for future possible implementations
        if ( !!callback ) {
            callback();
        }
    };

    // Get endpoint name(name from store).
    that.get_end_name = function ( endpoint, callback ) {
        var endpoint_name = { 'name': _store.get_collection_name( endpoint ) };
        callback( endpoint_name );
    };

    // Get names of sheets and sort them in order: ( group_id, sheet_id ).
    that.get_sheets_names = function ( callback ) {
        var sheet_id;
        var sheet_descr;
        var sheets_names = [];
        var sorted_sheets_names;

        for ( sheet_id in sheets ) {
            if ( sheets.hasOwnProperty( sheet_id ) ) {
                sheet_descr = get_sheet_description( sheet_id );
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
        var sheet = get_sheet( sheet_id );

        callback( { 'label': sheet['label'] } );
    };



    that.get_info = function ( sheet_id, row_id, callback ) {
        var sheet;
        var row;
        var info;

        sheet = get_sheet( sheet_id );
        row = _tree.get_node( sheet['data'], row_id );
        info = row['aux']['info'];

        return info;
    };



    that.sortable_columns = function ( sheet_id, callback ) {
        var sheet;
        var sortable_columns;

        sheet = get_sheet( sheet_id );
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
    that.sort = function ( sheet_id, sort_order, callback ) {
        // TOTEST
        //  ||
        //  \/
        var sort_order_to_function = function ( sort_order ) {
            // [
                // { 'key': 'abc',
                  // 'order': 1|-1
                // },
                // ...
            // ]
            return function( elem1, elem2 ) {
                var i;
                var key;
                var order;
                var result = 0;
            
                for ( i = 0; i < order.length && result !== 0; ++i ) {
                    key = sort_order[ i ]['key'];
                    order = sort_order[ i ]['order'];
                    
                    if ( elem1[ key ] > elem2[ key ] ) {
                        result = 1;
                    } else if ( elem1[ key ] < elem2[ key ] ) {
                        result = -1;
                    }
                    if ( order[ i ] === 'lt' ) {
                        result = -result;
                    }
                }
                
                return result;
            };
        };
        var sheet;
        var sorted_tree;
        var sort_fun;

        sheet = get_sheet( sheet_id );
        sort_fun = sort_order_to_function( sort_order );
        sorted_tree = _tree.sort( sheet['data'], sort_fun );
        sheet['data'] = sorted_tree;

        that.get_sheet_data( sheet_id, callback );
    };


    // Filter sheet and return it.
    that.filter = function ( sheet_id, criterion, callback ) {
        // TODO
        //  ||
        //  \/
        var criterion_to_function = function( node ) {
            var fun = function( node ) {
                return node[ 'id' ] % 2 === 1;
            };

            return fun;
        };

        var sheet;
        var new_sheet;
        var new_sheet_id;
        var filter_fun;
        var meta;

        sheet = get_sheet( sheet_id );
        filter_fun = criterion_to_function( criterion );
        meta = {
            'label': sheet['label'],
            'columns': sheet['columns']
        };
        new_sheet = create_sheet( sheet['endpoint'], _tree.tree_to_list( sheet['data'] ),
                                  meta, _enum['FILTERED'],
                                  {'sort_query'  : sheet['sort_query'],
                                   'filter_query': criterion } );
        filter_sheet( new_sheet, filter_fun );
        new_sheet_id = add_sheet( new_sheet );

        that.get_sheet_data( new_sheet_id, callback );
    };

    // Return gui-understandable data from sheet_id sheet.
    that.get_sheet_data = function ( sheet_id, callback ) {
        var sheet;
        var gui_data;

        sheet = get_sheet( sheet_id );
        gui_data = prepare_table_data( sheet_id );

        callback( gui_data );
    };


    that.close_sheet = function ( sheet_id, callback ){
        remove_sheet( sheet_id );
        if( !!callback ) {
            callback();
        }
    };

    that.copy_sheet = function ( sheet_id, callback ) {
        var sheet;
        var copied_sheet;
        var copied_sheet_id;
        var sheet_descr;

        sheet = get_sheet( sheet_id );
        copied_sheet = $.extend( true, {}, sheet );
        copied_sheet_id = add_sheet( copied_sheet );
        sheet_descr = get_sheet_description( copied_sheet_id );

        callback( sheet_descr );
    };

    // SEARCH FUNCTIONS
    // Get number of rows that match query in endpoints from enpoints_list.
    // Call callback passing results to it.
    that.get_search_count = function ( endpoints_list, query, callback ) {
        _store.get_search_count( endpoints_list, query, function ( data ) {
            var gui_results = {
                'query': query,
                'results': []
            };
            var top_parent_groups = {};

            data.forEach( function( result ) {
                var top_parent;
                var tree_id = result['tree_id'];
                var group = top_parent_groups[ tree_id ];

                if ( !group ) {
                    top_parent = _store.get_top_parent( tree_id )['label'];
                    group = {
                        'dbtree_top_parent_name': top_parent,
                        'data': []
                    };
                    gui_results['results'].push( group );
                    top_parent_groups[ tree_id ] = group;
                }
                group['data'].push({
                    'endpoint': tree_id,
                    'label': that.get_end_name( tree_id )['label'],
                    'found_count': result['count']
                });
            });

            callback( gui_results );
        });
    };

    // Get rows that match the given query and are in the given endpoint.
    // Call callback passing the rows to it.
    that.get_search_data = function ( endpoint, query, callback ) {
        _store.get_search_data( endpoint, query, function ( data, meta, boxes ) {
            var sheet;
            var sheet_id;
            var cleaned_data;
            var gui_data;
            var other_fields = {
                'query': query,
                'boxes': boxes
            };
            
            cleaned_data = clean_data( data, meta['columns'] );
            sheet = create_sheet( endpoint, cleaned_data, meta,
                                  _enum['SEARCHED'], other_fields );
            sheet_id = add_sheet( sheet );
            gui_data = prepare_table_data( sheet_id );

            callback( gui_data );
        });
    };
    
    // PERMALINK FUNCTIONS

    // Creates permalink from sheets which id is in list sheet_id.
    // If sheet_id is undefined, then all sheets will be used to
    // create permalink.
    that.create_permalink = function ( sheet_ids, callback ) {
        var sheet_ids = sheet_ids || get_sorted_ids();
        var all_sheets = [];

        sheet_ids.forEach( function ( id ) {
            all_sheets.push( get_sheet( id ) );
        });

        var permalink_data = _permalinks.prepare_permalink( all_sheets, sheet_ids );

        _store.store_state( permalink_data, callback );
    };

    // Download data from permalink which id is permalink_id. Data will
    // come from endpoints that are in endpoints list. For sheets from
    // each endpoint a callback from the callbacks list is called. Sequence
    // of callbacks has the same order as sequence of endpoints.
    that.restore_permalink = function ( permalink_id, endpoints, callbacks ) {
        var permalinks_data = endpoints.map( function ( e ) {
            return {
                'permalink_id': permalink_id,
                'endpoint': e
            };
        });
        get_many( permalinks_data, that.get_permalink_part, callbacks );
    };

    // Download data from one endpoint from the permalink. Both are described
    // by permalink_data_descr. Create sheets, that were saved in the permalink
    // and contained data from the endpoint. For each sheet call callback
    // function with gui-understandable data from this sheet.
    that.get_permalink_part = function ( permalink_part_descr, callback ) {
        _store.restore_state( permalink_part_descr['permalink_id'],
                              permalink_part_descr['endpoint'],
                              function( group ) {
            var data_tree = _tree.create_tree( group['data'], 'id', 'parent' );

            // For each sheet in group: get data that needs to be inserted into
            // its tree, create and add a new sheet containing that data
            group['sheets'].forEach( function ( permalink_sheet ) {
                var sheet_data = _permalinks.restore_sheet_data( permalink_sheet, data_tree );
                var sheet;
                var sheet_id;
                var additional_fields = _permalinks.get_additional_fields( permalink_sheet );

                sheet = create_sheet( group['endpoint'], sheet_data, group['meta'],
                                      permalink_sheet['type'], additional_fields );
                sheet_id = add_sheet( sheet );
                that.get_sheet_data( sheet_id, callback );
            });
        });
    };

// P R I V A T E   I N T E R F A C E
    var sheets = {};

    function get_sheet( sheet_id ) {
        return sheets[ sheet_id ];
    }

    function remove_sheet( sheet_id ) {
        delete sheets[ sheet_id ];
    }

    function get_sorted_ids() {
        var sheet_id;
        var ids = [];
        var sorted_ids = [];

        for ( sheet_id in sheets ) {
            if ( sheets.hasOwnProperty( sheet_id ) ) {
                ids.push( parseInt( sheet_id ) );
            }
        }

        sorted_ids = ids.sort( function ( id1, id2 ) {
            return id1 - id2;
        });

        return sorted_ids;
    }

    // Return group id assigned to endpoint.
    // If there is no group with data from this endpoint, next
    // group id will be returned.
    function get_group_id( endpoint ) {
        var sheet_id;
        var sheet;
        var group_id;
        var max_group_id;
        var group_found = false;

        max_group_id = -1;
        for ( sheet_id in sheets ) {
            if ( sheets.hasOwnProperty( sheet_id ) ) {
                sheet = sheets[ sheet_id ];
                // group with this endpoint is found
                if ( sheet['endpoint'] === endpoint ) {
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
    function create_sheet( endpoint, data, meta, type, other_fields ) {
        var new_sheet;
        var active_columns;
        var cleaned_data;
        var cleaned_tree_data;
        var group_id;
        var type = type || _enum['STANDARD'];
        var other_fields = other_fields || {};

        active_columns = meta['columns'].filter( function ( column ) {
            return !!column['basic'];
        });

        // Remove unnecessary columns and inserts cleaned data into tree.
        cleaned_data = clean_data( data, active_columns );
        cleaned_tree_data = _tree.create_tree( cleaned_data, 'id', 'parent' );

        group_id = get_group_id( endpoint );
        new_sheet = {
            'group_id': group_id,
            'endpoint': endpoint,
            'data': cleaned_tree_data,
            'label': meta['label'],
            'columns': active_columns,
            'type': type,
            'any_selected': false
        };

        switch ( type ) {
            case _enum['STANDARD']:
                new_sheet['sort_query'] = other_fields['sort_query'];
                break;
            case _enum['FILTERED']:
                new_sheet['sort_query'] = other_fields['sort_query'];
                new_sheet['filter_query'] = other_fields['filter_query'];
                break;
            case _enum['SEARCHED']:
                new_sheet['query'] = other_fields['query'];
                new_sheet['boxes'] = other_fields['boxes'];
                break;
            default:
                throw 'Bad sheet type';
        }

        return new_sheet;
    }
    
    function filter_sheet( sheet, filter_function ) {
        var filtered_tree = _tree.filter( sheet['data'], filter_function );
        sheet['data'] = filtered_tree;
    }

    var generate_sheet_id = ( function () {
        var next_sheet_id = 10000;
        return (function() {
            return function() {
                var new_sheet_id = next_sheet_id;
                next_sheet_id += 1;
                return new_sheet_id;
            }
        })();
    })();

    // Add a new sheet and return its id.
    function add_sheet( new_sheet ) {
        var sheet_id = generate_sheet_id();

        sheets[ sheet_id ] = new_sheet;

        return sheet_id;
    }

    function get_many( values, get_one, callbacks ) {
        var get_next = function ( count ) {
            var value = values.shift();
            var callback = callbacks[ count ];

            if ( value === undefined ) return;

            get_one( value, function ( data ) {
                callback( data );
                get_next( count + 1 );
            });
        };

        get_next( 0 );
    }

    function prepare_table_data( sheet_id, data ) {
        var sheet = get_sheet( sheet_id );
        // if data to prepare was not passed, use full data from sheet
        var data = data || _tree.tree_to_list( sheet['data'] );

        return _ui.prepare_data_package( sheet, sheet_id, data );
    }

    function get_sheet_description( sheet_id ) {
        var sheet = get_sheet( sheet_id );

        return {
            'name': sheet['label'],
            'sheet_id': sheet_id,
            'group_id': sheet['group_id'],
            'endpoint': sheet['endpoint']
        };
    }

    // Return data that contains columns that are in columns list.
    function clean_data( data, columns ) {
        var clean_node = function( node, columns ) {
            var property;
            var new_node = {
                'aux': {},
                'data': {}
            };

            new_node['id'] = node['id'];
            new_node['parent'] = node['parent'];
            new_node['leaf'] = node['leaf'];

            for ( property in node['aux'] ) {
                if ( node['aux'].hasOwnProperty( property )) {
                    new_node['aux'][ property ] = node[ property ];
                }
            }
            columns.forEach( function ( column ) {
                new_node['data'][ column['key'] ] = node['data'][ column['key'] ];
            });

            new_node['state'] = {
                'selected': undefined,
                'is_open': false
            };

            return new_node;
        };

        var cleaned_data = data.map( function( node ) {
            return clean_node( node, columns );
        });

        return cleaned_data;
    }

    // selected row get 'top' attribute, his descdendants 'inside'
    // attribute, next row after his last descendant 'after' attribute
    function set_selection( sheet_id, root_id, selection_type ) {
        var sheet = get_sheet( sheet_id );
        var subtree_root;

        subtree_root = sheet['data'].getNode( root_id );
        subtree_root['state']['selected'] = selection_type;
    }

    // Set correct selection for all nodes in sheet which id is sheet_id.
    function reset_selection( sheet_id ) {
        var sheet = get_sheet( sheet_id );
        var any_selected = sheet['any_selected'];
        var selected_id = find_selected_row( sheet_id );
        var selected_node;
        var after_node;

        if ( !any_selected ) {
            // if nothing is selected, clear selection in all nodes
            _tree.iterate( sheet['data'], function ( node ) {
                node['state']['selected'] = undefined;
            });
        } else {
            // if something is selected, dim everything in the begining
            _tree.iterate( sheet['data'], function ( node ) {
                node['state']['selected'] = 'dim';
            });
            selected_node = _tree.get_node( sheet['data'], selected_id );
            after_node = _tree.right_node( sheet['data'], selected_id );

            // next set in-selected parameter for selected node and his children
            _tree.iterate( sheet['data'], function ( node ) {
                node['state']['selected'] = 'in-selected';
            }, selected_node, after_node );

            // correct selected parameter for selected node
            selected_node['state']['selected'] = 'selected'
            if ( !!after_node ) {
                // if there is a node after selected, then mark it as after-selected
                after_node['state']['selected'] = 'after-selected';
            }
        }
    }

    // Returns selected nodes id. If no node is selected, then
    // undefined is returned.
    function find_selected_row( sheet_id ) {
        var sheet = get_sheet( sheet_id );
        var top_level = _tree.get_children_nodes( sheet['data'] );

        var selected_id;
        var selected_nodes = top_level.filter( function ( node ) {
            return node['state']['selected'] === 'selected';
        });

        if ( selected_nodes.length > 0 ) {
            selected_id = selected_nodes[0]['id'];
        } else {
            selected_id = undefined;
        }

        return selected_id;
    }

    return that;
}) ();
