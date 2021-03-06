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
    that.get_collections = function ( callback ) {
        _store.get_collections( callback );
    };

    // Get top levels and call callbacks with data (top level + meta) from them,
    // order of callbacks is the same as order of endpoints.
    that.get_top_levels = function ( endpoints, init_callback, callbacks ) {
        // Create_empty_sheets for endpoints
        // with data for sheet tabs(get_sheets_names)
        endpoints.forEach( function ( endpoint ) {
            var label = _store.get_collection_name( endpoint );
            var add_fields = { 'blocked': true };
            var empty_sheet = create_sheet( endpoint, [], label, [],
                                            _enum['STANDARD'], add_fields );
            add_sheet( empty_sheet );
        });
        init_callback();

        get_many( endpoints, collect_sheets_data, callbacks );
    };

    // Get children of parent_id row from sheet_id sheet.
    that.get_children = function ( sheet_id, parent_id, callback ) {
        var respond = function() {
            var gui_data;
            var children = _tree.get_nonempty_children_nodes( sheet['data'], parent_id );
            if ( sheet['type'] === _enum['STANDARD'] ) {
                open_row( sheet_id, parent_id );
            }

            if ( should_return ) {
                gui_data = prepare_table_data( sheet_id, children );
                callback( gui_data );
            } else {
                callback( {} );
            }
        };
        var sheet = get_sheet( sheet_id );
        var should_ask_store = ( sheet['type'] === _enum['SEARCHED'] ||
                    !_tree.get_children_number( sheet['data'], parent_id ) );
        var should_return = ( sheet['type'] !== _enum['SEARCHED'] );

        if ( should_ask_store ) {
            _store.get_children( sheet['endpoint'], parent_id, function( data ) {
                var cleaned_data;
                var sort_fun;

                // Remove unnecessary fields(not present in columns list) from children
                // and update tree.
                cleaned_data = clean_data( data, sheet['columns'] )
                if ( !!sheet['sort_query'] && sheet['sort_query'].length > 0 ) {
                    sort_fun = sort_criterion_to_function( sheet['sort_query'] );
                    cleaned_data.sort( sort_fun );
                }
                _tree.update_tree( sheet['data'], cleaned_data );
                if ( !!sheet['any_selected'] ) {
                    reset_selection( sheet_id );
                }

                respond();
            });
        } else {
            respond();
        }
    };

    // Remove node from tree.
    that.remove_row = function ( sheet_id, row_id ) {
        var sheet;

        sheet = get_sheet( sheet_id );
        _tree.remove_node( sheet['data'], row_id );
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
        close_row( sheet_id, parent_id );
    };



    that.row_selected = function ( sheet_id, selected_id, prev_selected_id ) {
        var sheet = get_sheet( sheet_id );

        // if there was a selected row
        // tested against undefined to keep 0 as potential id
        if( prev_selected_id !== undefined ) {
            set_selection( sheet_id, prev_selected_id, 'dim' );
            set_selection( sheet_id, selected_id, 'selected' );
            sheet['any_selected'] = true;
            reset_selection( sheet_id );
        } else {
            set_selection( sheet_id, selected_id, 'selected' );
            sheet['any_selected'] = true;
            reset_selection( sheet_id );
        }
    };

    that.unselect_all = function ( sheet_id ) {
        var sheet = get_sheet( sheet_id );

        set_selection( sheet_id, undefined, undefined );
        sheet['any_selected'] = false;
        reset_selection( sheet_id );
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

        if ( !!callback ) {
            callback( columns );
        } else {
            return columns;
        }
    };

    // Update columns in sheet. Return sheet data with new columns.
    that.show_with_columns = function ( sheet_id, columns, callback ) {
        var selected_columns;
        var selected_column_keys;
        var all_columns;
        var sheet;
        var full_collection;
        var cleaned_full_data;

        sheet = get_sheet( sheet_id );

        // Get selected columns description.
        selected_column_keys = {};
        columns.forEach( function ( column ) {
            selected_column_keys[ column ] = true;
        });
        all_columns = _store.get_columns( sheet['endpoint'] );
        selected_columns = all_columns.filter( function ( column ) {
            return !!selected_column_keys[ column['key'] ];
        });

        // Update columns in sheet.
        sheet['columns'] = selected_columns;

        // Get list of all nodes with needed columns only
        full_collection = _store.get_collection_data( sheet['endpoint'] );
        cleaned_full_data = clean_data( full_collection, sheet['columns'], true );
        sheet['total'] = remove_total_row( cleaned_full_data );

        // Insert to new tree cleaned nodes(only those that were in old tree)
        cleaned_full_data.forEach( function ( cleaned_node ) {
            if ( _tree.has_node( sheet['data'], cleaned_node['id'] ) ) {
                _tree.update_node( sheet['data'], cleaned_node['id'], cleaned_node );
            }
        });

        // Update tree
        that.get_sheet_data( sheet_id, callback );
    };


    // Clean sheet so that it contains only top level data.
    that.clean_table = function ( sheet_id, callback ) {
        var sheet = get_sheet( sheet_id );

        _store.get_top_level( sheet['endpoint'], function ( data ) {
            var cleaned_data = clean_data( data, sheet['columns'] );
            remove_total_row( cleaned_data );

            sheet['data'] = _tree.create_tree( cleaned_data, 'id', 'parent' );
            sheet['sort_query'] = [];
            sheet['any_selected'] = false;

            that.get_sheet_data( sheet_id, callback );
        });
    };



    that.change_name = function ( sheet_id, new_name, callback ) {
        var sheet = get_sheet( sheet_id );

        sheet['label'] = new_name;

        // for future possible implementations
        if( !!callback ) {
            callback();
        }
        else {
            return sheet['label'];
        }
    };

    // Get endpoint name(name from store).
    that.get_end_name = function ( endpoint, callback ) {
        var endpoint_name = { 'name': _store.get_collection_name( endpoint ) };
        callback( endpoint_name );
    };

    // Get names of sheets and sort them in order: ( group_id, sheet_id ).
    that.get_sheets_labels = function ( callback ) {
        var sheet_id;
        var sheet_descr;
        var sheets_names = [];
        var sorted_sheets_names;
        var result;

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

        result = { 'sheets': sorted_sheets_names };
        if ( !!callback ) {
            callback( result );
        } else {
            return result;
        }
    };

    // Get grouped sheets for download
    that.get_grouped_sheets = function ( callback ) {
        var create_group = function( sheet ) {
            return {
                'group_name': _store.get_collection_name( sheet['endpoint'] ),
                'sheets'    : []
            };
        };
        var sheets_list = that.get_sheets_labels();
        if ( sheets_list['sheets'].length === 0 ) {
            return [];
        }
        var last_group = create_group( sheets_list['sheets'][0] );
        var grouped_sheets = [ last_group ];
        sheets_list['sheets'].forEach( function ( sheet_info ) {
            var endpoint_name = _store.get_collection_name( sheet_info['endpoint'] );
            if ( last_group['group_name'] !== endpoint_name ) {
                last_group = create_group( sheet_info );
                grouped_sheets.push( last_group );
            }
            last_group['sheets'].push({
                'id': sheet_info['sheet_id'],
                'name': sheet_info['name']
            });
        });

        if ( !!callback ) {
            callback( grouped_sheets );
        } else {
            return grouped_sheets;
        }
    };

    that.get_sheet_name = function ( sheet_id ) {
        var sheet = get_sheet( sheet_id );
        var original_label = _store.get_collection_name( sheet['endpoint'] );

        return {
            'label'     : sheet['label'],
            'old_label' : original_label
        };
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



    that.get_sortable_columns = function ( sheet_id, callback ) {
        var sheet;
        var sortable_columns;

        sheet = get_sheet( sheet_id );
        sortable_columns = sheet['columns'].filter( function ( column ) {
            return !!column['processable'];
        }).map( function ( column ) {
            return {
                'label': column['label'],
                'key'  : column['key']
            };
        });

        callback( {'columns': sortable_columns} );
    };

    that.get_filterable_columns = function ( sheet_id, callback ) {
        var sheet;
        var filterable_columns;

        sheet = get_sheet( sheet_id );
        filterable_columns = sheet['columns'].filter( function ( columns ) {
            return !!columns['processable'];
        }).map( function ( column ) {
            return {
                'label': column['label'],
                'key'  : column['key'],
                'type' : column['type']
            };
        });

        callback( {'columns': filterable_columns} );
    };

    // Sort sheet(in specified order) and return it.
    that.sort = function ( sheet_id, sort_criterion, callback ) {
        var sort_criterion_to_function = function( sort_criterion ) {
            return function( node1, node2 ) {
                return compare_nodes( node1, node2, sort_criterion );
            };
        };
        var sheet;
        var sorted_tree;
        var sort_fun;

        sheet = get_sheet( sheet_id );
        sort_fun = sort_criterion_to_function( sort_criterion );
        sorted_tree = _tree.sort( sheet['data'], sort_fun );
        sheet['data'] = sorted_tree;
        sheet['sort_query'] = sort_criterion;
        reset_selection( sheet_id );

        if ( !!callback ) {
            that.get_sheet_data( sheet_id, callback );
        }
    };


    // Filter sheet and return it.
    that.filter = function ( sheet_id, criterions, callback ) {
        var sheet;
        var new_sheet;
        var new_sheet_id;
        var meta;
        var additional_parameters;

        sheet = get_sheet( sheet_id );
        additional_parameters = {
            'sort_query'  : sheet['sort_query'],
            'filter_query': criterions
        };
        new_sheet = create_sheet( sheet['endpoint'], _tree.tree_to_list( sheet['data'] ),
                                  sheet['label'], sheet['columns'],
                                  _enum['FILTERED'], additional_parameters );
        new_sheet_id = add_sheet( new_sheet );

        if ( !!callback ) {
            that.get_sheet_data( new_sheet_id, callback );
        }
    };

    // Return gui-understandable data from sheet_id sheet.
    that.get_sheet_data = function ( sheet_id, callback ) {
        var sheet    = get_sheet( sheet_id );
        var gui_data = prepare_table_data( sheet_id );

        if( !!callback ) {
            callback( gui_data );
        }
        else {
            return gui_data;
        }
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
        copied_sheet['data'] = _tree.copy( sheet['data'] );
        copied_sheet_id = add_sheet( copied_sheet );
        sheet_descr = get_sheet_description( copied_sheet_id );

        callback( sheet_descr );
    };

    that.toggle_breadcrumb = function ( sheet_id, box_id, callback ) {
        var box = get_box( sheet_id, box_id );
        var gui_data;

        box['breadcrumb'] = !box['breadcrumb'];

        gui_data = prepare_table_data( sheet_id, box );
        callback( gui_data );
    };

    that.toggle_context = function ( sheet_id, box_id, callback ) {
        function response( sheet_id, box ) {
            var gui_data;
            box['context'] = !box['context'];
            gui_data = prepare_table_data( sheet_id, box );
            callback( gui_data );
        }
        var box = get_box( sheet_id, box_id );
        var sheet = get_sheet( sheet_id );
        var parent_id = _tree.get_parent_id( sheet['data'], box['rows'][0]['id'] );
        var box_ids = {};

        if ( !box['context'] ) {
            parent_id = parent_id || sheet['endpoint'];
            that.get_children( sheet_id, parent_id, function ( children ) {
                response( sheet_id, box );
            });

        } else {
            box['rows'].forEach( function ( row ) {
                box_ids[ row['id'] ] = true;
            });
            _tree.get_nonempty_children_nodes( sheet['data'], parent_id ).filter( function ( row ) {
                return !_tree.get_children_number( sheet['data'], parent_id );
            }).forEach( function ( row ) {
                that.remove_node( sheet_id, row['id'] );
            });

            response( sheet_id, box );
        }
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
                var top_parent = _store.get_top_parent( result['endpoint'] );
                var top_id = top_parent['id'];
                var group = top_parent_groups[ top_id ];

                if ( !group ) {
                    group = {
                        'dbtree_top_parent_name': top_parent['name'],
                        'data': []
                    };
                    gui_results['results'].push( group );
                    top_parent_groups[ top_id ] = group;
                }
                group['data'].push({
                    'endpoint': result['endpoint'],
                    'label': _store.get_collection_name( result['endpoint'] ),
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
            sheet = create_sheet( endpoint, cleaned_data, meta['label'],
                                  meta['columns'], _enum['SEARCHED'], other_fields );
            sheet_id = add_sheet( sheet );
            gui_data = prepare_table_data( sheet_id );

            callback( gui_data );
        });
    };

    // PERMALINK FUNCTIONS

    // Creates permalink from sheets which id is in list sheet_id.
    // If sheet_id is an empty list, then all sheets will be used to
    // create permalink.
    that.create_permalink = function ( sheet_ids, callback ) {
        var all_sheets = [];
        if ( sheet_ids.length === 0 ) {
            sheet_ids = get_sorted_ids();
        }

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
        // TODO specify this object on the server-side
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
                var sheet;
                var sheet_id;
                var gui_data;
                var sheet_data = _permalinks.restore_sheet_data( permalink_sheet, data_tree );
                var additional_fields = _permalinks.get_additional_fields( permalink_sheet );
                var full_columns = _store.get_columns( group['endpoint'] );
                var columns = get_filtered_columns( permalink_sheet['columns'], full_columns );

                sheet = create_sheet( group['endpoint'], sheet_data, permalink_sheet['label'],
                                      columns, permalink_sheet['type'], additional_fields );

                sheet['columns'] = columns;
                sheet_id = add_sheet( sheet );
                if ( sheet['type'] === _enum['STANDARD'] ) {
                    permalink_sheet['data']['ids'].forEach( function ( id ) {
                        var branch = _tree.get_parents( sheet['data'], id );
                        branch.push( _tree.get_node( sheet['data'], id ) );
                        branch.filter( function ( node_copy ) {
                            var node = _tree.get_node( sheet['data'], node_copy['id'] );
                            return node['data']['type'] !== 'Empty';
                        }).forEach( function ( node ) {
                            open_row( sheet_id, node['id'] );
                        });
                    });
                }
                gui_data = prepare_table_data( sheet_id );
                callback({
                    'tabs': that.get_sheets_labels(),
                    'data': gui_data
                });
            });
        });
    };

    // DOWNLOAD FUNCTIONS
    // Download data from selected sheets and endpoints.
    that.download_data = function( sheet_ids, endpoints, callback ) {
        var sheets = sheet_ids.map( function ( id ) {
            return get_sheet( id );
        });
        var data = _download.prepare_download_data( sheets, endpoints );
        callback( data );
    }

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

    function get_box( sheet_id, box_id ) {
        var sheet = get_sheet( sheet_id );

        if ( sheet['type'] !== _enum['SEARCHED'] ) {
            return undefined;
        } else {
            // TODO: is it the best way? maybe each box should have id
            return sheet['boxes'][ box_id ];
        }
    }

    // Create new sheet from data.
    function create_sheet( endpoint, data, label, columns, type, other_fields ) {
        var new_sheet;
        var cleaned_data;
        var cleaned_tree_data;
        var group_id;
        var type = type || _enum['STANDARD'];
        var other_fields = other_fields || {};
        var total_row;

        // Remove unnecessary columns and inserts cleaned data into tree.
        cleaned_data = clean_data( data, columns );
        total_row = remove_total_row( cleaned_data );
        cleaned_tree_data = _tree.create_tree( cleaned_data, 'id', 'parent' );

        group_id = get_group_id( endpoint );
        new_sheet = {
            'group_id': group_id,
            'endpoint': endpoint,
            'data'    : cleaned_tree_data,
            'label'   : label,
            'columns' : columns,
            'type'    : type,
            'total'   : total_row
        };

        additional_operations( new_sheet, other_fields );

        return new_sheet;
    }

    function additional_operations( sheet, other_fields ) {
        var field;

        // copy additional, expected fields
        switch ( sheet['type'] ) {
            case _enum['STANDARD']:
                sheet['sort_query'] = other_fields['sort_query'] || [];
                sheet['data'] = sort_data( sheet['data'], sheet['sort_query'] );
                sheet['any_selected'] = false;
                break;
            case _enum['FILTERED']:
                sheet['sort_query'] = other_fields['sort_query'] || [];
                sheet['filter_query'] = other_fields['filter_query'];
                sheet['data'] = sort_data( sheet['data'], sheet['sort_query'] );
                sheet['data'] = filter_data( sheet['data'], sheet['filter_query'] );
                break;
            case _enum['SEARCHED']:
                sheet['query'] = other_fields['query'];
                sheet['boxes'] = prepare_boxes( other_fields['boxes'] );
                break;
            default:
                throw 'Bad sheet type';
        }
        // copy additional, unexpected fields
        for ( field in other_fields ) {
            if ( other_fields.hasOwnProperty( field ) && sheet[ field ] === undefined ) {
                sheet[ field ] = other_fields[ field ];
            }
        }
    }

    function remove_total_row( rows ) {
        var len = rows.length;
        if ( len > 0 && rows[ len - 1 ]['data']['type'] === 'Total' ) {
            return rows.pop();
        }
        return undefined;
    }

    function sort_data( data, criterions ) {
        var sort_fun = sort_criterion_to_function( criterions );
        return _tree.sort( data, sort_fun );
    }

    function filter_data( data, criterions ) {
        var filter_fun = filter_criterion_to_function( criterions );

        return _tree.filter( data, filter_fun );
    }

    // Find FIRST blocked sheet that was created when data
    // was downloaded from the given endpoint.
    function find_blocked_sheet( endpoint ) {
        var sheet_id;
        var sheet;

        for ( sheet_id in sheets ) {
            if ( sheets.hasOwnProperty( sheet_id ) ) {
                sheet = get_sheet( sheet_id );
                if ( !!sheet['blocked'] ) {
                    return parseInt( sheet_id );
                }
            }
        }

        return undefined;
    }

    var generate_sheet_id = ( function () {
        var next_sheet_id = 10000;
        return (function() {
            return function() {
                var new_sheet_id = next_sheet_id;
                next_sheet_id += 1;
                return new_sheet_id;
            };
        })();
    })();

    // Add a new sheet and return its id. Can replace sheet with replace_id
    // if replace_id is defined.
    function add_sheet( new_sheet, replace_id ) {
        var sheet_id = replace_id || generate_sheet_id();

        sheets[ sheet_id ] = new_sheet;

        return sheet_id;
    }

    function get_many( values, get_one, callbacks ) {
        values.forEach( function( value, index ) {
            var callback = callbacks[ index ];

            get_one( value, function ( data ) {
                callback( data );
            });
        });
    }

    function prepare_table_data( sheet_id, data ) {
        var sheet = get_sheet( sheet_id );
        // if data to prepare was not passed, use full data from sheet
        var ui_data;
        if ( sheet['type'] !== _enum['SEARCHED'] ) {
            ui_data = data || _tree.tree_to_list( sheet['data'] );
        } else {
            ui_data = data;
        }

        return _ui.prepare_data_package( sheet, sheet_id, ui_data );
    }

    function get_sheet_description( sheet_id ) {
        var sheet = get_sheet( sheet_id );

        return {
            'name'    : sheet['label'],
            'sheet_id': sheet_id,
            'group_id': sheet['group_id'],
            'endpoint': sheet['endpoint'],
            'blocked' : sheet['blocked'] || false
        };
    }

    // Get description of all sheets' labels and top level data
    // of the given endpoint.
    function collect_sheets_data( endpoint, callback ) {
        get_top_level( endpoint, function( gui_data ) {
            callback({
                'tabs': that.get_sheets_labels(),
                'data': gui_data
            });
        });
    }

    // Get top level data from store and prepare it for
    // gui-understandable form.
    function get_top_level( endpoint, callback ) {
        _store.get_init_data( endpoint, function( data, meta ) {
            var sheet_id;
            var sheet;
            var gui_data;
            var basic_columns = get_basic_columns( meta['columns'] );

            sheet = create_sheet( endpoint, data, meta['label'], basic_columns );
            sheet_id = find_blocked_sheet( endpoint );
            sheet_id = add_sheet( sheet, sheet_id );
            gui_data = prepare_table_data( sheet_id );

            callback( gui_data );
        });
    }

    // Get full description of columns that have keys in columns_names
    // from full_columns list.
    function get_filtered_columns( columns_names, full_columns ) {
        var needed_columns = {};
        columns_names.forEach( function ( name ) {
            needed_columns[ name ] = true;
        });

        return full_columns.filter( function ( col ) {
            return !!needed_columns[ col['key'] ];
        });
    }

    function get_basic_columns( full_columns ) {
        return full_columns.filter( function ( col ) {
            return col['basic'];
        });
    }

    // Update columns in sheet.
    function update_data( data, full_data, columns ) {
        // Get list of all nodes with needed columns only
        var cleaned_full_data = clean_data( full_data, columns, true );

        // Insert to new tree cleaned nodes(only those that were in old tree)
        cleaned_full_data.forEach( function ( cleaned_node ) {
            if ( _tree.has_node( data, cleaned_node['id'] ) ) {
                _tree.update_node( data, cleaned_node['id'], cleaned_node );
            }
        });
    };

    // Return data that contains columns that are in columns list.
    function clean_data( data, columns, omit_state ) {
        var clean_node = function( node, columns, ignore_state ) {
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

            if ( !ignore_state ) {
                new_node['state'] = {
                    'selected': undefined,
                    'is_open' : false
                };
            }

            return new_node;
        };
        var omit_state = !!omit_state;

        var cleaned_data = data.map( function( node ) {
            return clean_node( node, columns, omit_state );
        });

        return cleaned_data;
    }

    function set_open_state( sheet_id, id, new_state ) {
        var sheet = get_sheet( sheet_id );
        var node = _tree.get_node( sheet['data'], id );
        node['state']['is_open'] = new_state;
    }

    function open_row( sheet_id, id ) {
        set_open_state( sheet_id, id, true );
    }

    function close_row( sheet_id, id ) {
        set_open_state( sheet_id, id, false );
    }

    // selected row get 'top' attribute, his descdendants 'inside'
    // attribute, next row after his last descendant 'after' attribute
    function set_selection( sheet_id, root_id, selection_type ) {
        var sheet = get_sheet( sheet_id );
        var subtree_root;

        if( !root_id ) {
            return;
        }
        subtree_root = _tree.get_node( sheet['data'], root_id );
        if( !subtree_root ) {
            return;
        }
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
        var top_level = _tree.get_nonempty_children_nodes( sheet['data'] );

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

    // Change boxes that come from server to boxes used by resource.
    function prepare_boxes( boxes ) {
        // check if they come from permalink, if yes, then just copy
        if ( boxes.length > 0 && !!boxes[0]['rows'] ) {
            return boxes;
        }

        return boxes.map( function( box ) {
            return {
                'rows': box,
                'breadcrumb': false,
                'context': false
            };
        });
    }

    function sort_criterion_to_function ( sort_criterion ) {
        return function( node1, node2 ) {
            return compare_nodes( node1, node2, sort_criterion );
        };
    }

    function filter_criterion_to_function ( filter_criterion ) {
        return function( node ) {
            return filter_node( node, filter_criterion );
        };
    }

    function compare_nodes( node1, node2, criterions ) {
        var i;
        var result = 0;
        var key;
        var preference;
        var value1;
        var value2;

        if ( criterions.length >= 1 ) {
            for ( i = 0; i < criterions.length; ++i ) {
                key = criterions[ i ]['key'];
                value1 = node1['data'][ key ];
                value2 = node2['data'][ key ];
                preference = criterions[ i ]['preference'];
                result = compare_values( value1, value2, preference );
                if ( !!result ) {
                    break;
                }
            }
            return result;
        } else {
            return node1['id'] - node2['id'];
        }
    }

    function compare_values( value1, value2, preference ) {
        var result;

        switch ( typeof value1 ) {
            case 'number':
                result = compare_number( value1, value2 );
                break;
            case 'string':
                result = compare_string( value1, value2 );
                break;
            default:
                throw 'Bad sort value type';
        }

        if ( preference === 'lt' ) {
            result = -result;
        }

        return result;
    }

    function compare_number( number1, number2 ) {
        return number1 - number2;
    }

    function compare_string( string1, string2 ) {
        var alphabet = "0123456789a\u0105bc\u0107de\u0119fghijkl\u0142mn\u0144o\u00f3pqrs\u015btuvwxyz\u017a\u017c";
        // compare_letter is slighlty modified alpha function from
        // http://stackoverflow.com/questions/3630645/how-to-compare-utf-8-strings-in-javascript/3633725#3633725
        // written by Mic and Tomasz Wysocki
        function compare_letter( a, b ) {
            var ia = alphabet.indexOf( a );
            var ib = alphabet.indexOf( b );

            if ( a === b ) {
                return 0;
            }

            if ( ia === -1 || ib === -1 ) {
                if ( ia === -1 )
                    return ( a > 'a' ) ? 1 : -1;
                if ( ib === -1 )
                    return ( b > 'a' ) ? -1 : 1;
                return ( a > b ) ? 1 : -1;
            } else {
                return ia - ib;
            }
        }

        var min_length = Math.min( string1.length, string2.length );
        var lower_string1 = string1.toLowerCase();
        var lower_string2 = string2.toLowerCase();
        var i;
        var result = 0;
        for ( i = 0; i < min_length; ++i ) {
            result = compare_letter( lower_string1[ i ], lower_string2[ i ] );
            if ( !!result ) {
                return result;
            }
        }

        return string1.length - string2.length;
    }

    function filter_node( node, criterions ) {
        var passed = true;

        criterions.forEach( function ( criterion ) {
            if ( !passed ) return;

            passed = check_criterion( node, criterion );
        });

        return passed;
    }

    function check_criterion( node, criterion ) {
        var node_value = node['data'][ criterion['key'] ];
        var node_lowercase;
        var filter_value = criterion['value'];
        var filter_lowercase;
        var preference = criterion['preference'];

        switch ( typeof node_value ) {
            case 'number':
                return check_number( node_value, filter_value, preference );
            case 'string':
                node_lowercase = node_value.toLowerCase();
                filter_lowercase = filter_value.toLowerCase();
                return check_string( node_lowercase, filter_lowercase, preference );
            default:
                throw 'Bad filter criterion type';
        }
    }

    function check_number( node_value, filter_value, preference ) {
        switch ( preference ) {
            case 'lt':
                return ( node_value < filter_value );
            case 'eq':
                return ( node_value === filter_value );
            case 'gt':
                return ( node_value > filter_value );
            default:
                throw 'Bad number critertion preference';
        }
    }

    function check_string( node_value, filter_value, preference ) {
        switch ( preference ) {
            case 'nst':
                return ( node_value.indexOf( filter_value ) !== 0 );
            case 'ncnt':
                return ( node_value.indexOf( filter_value ) === -1 );
            case 'cnt':
                return ( node_value.indexOf( filter_value ) !== -1 );
            case 'st':
                return ( node_value.indexOf( filter_value ) === 0 );
            default:
                throw 'Bad string critertion preference';
        }
    }

    that.row_selected = _logger.log( that.row_selected );
    return that;
}) ();
