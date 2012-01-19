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

var _permalinks = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};
    
    // Create permalink data for sheets from sheets list. Their ids are in
    // ids list. Id of sheet sheets[i] is ids[i].
    that.prepare_permalink = function( sheets, ids, next_node_fun_gen, is_filtered_fun_gen ) {
        var permalink_data = [];
        var grouped_sheets = group_sheets( sheets, ids );
        
        grouped_sheets.forEach( function ( group ) {
            var prepared_sheets = [];
            var endpoint;
            
            group['sheets'].forEach( function ( sheet_info ) {
                var sheet_id = sheet_info['sheet_id'];
                var sheet = sheet_info['sheet'];
                var next_node_fun = function( node ) {
                    return next_node_fun_gen( sheet['data'], node );
                };
                var is_filtered_fun = function( node ) {
                    return is_filtered_fun_gen( sheet['data'], node );
                };
                
                endpoint = sheet['endpoint'];
                var prepared_sheet = sheet_to_permalink( sheet, next_node_fun, is_filtered_fun );
                prepared_sheets.push( prepared_sheet );
            });
            
            permalink_data.push({
                'endpoint': endpoint,
                'sheets'  : prepared_sheets
            });
        });
        
        return permalink_data;
    };
    
    that.restore_sheet_data = function( sheet, make_tree_fun, get_top_level_fun, get_children_fun,
                                        get_ancestors_fun, sort_fun, filter_fun ) {
        var sheet_data;
        var tree_data;
        
        switch ( sheet['type'] ) {
            case _enum['STANDARD']:
                sheet_data = get_standard_sheet_data( sheet['data'], get_top_level_fun,
                                get_children_fun, get_ancestors_fun );
                tree_data = make_tree_fun( sheet_data );
                sheet_data = sort_fun( tree_data );
                break;
            case _enum['FILTERED']:
                sheet_data = get_filtered_sheet_data( sheet['data'], get_top_level_fun,
                                get_children_fun, get_ancestors_fun );
                tree_data = make_tree_fun( sheet_data );
                tree_data = sort_fun( tree_data );
                sheet_data = filter_fun( tree_data );
                break;
            case _enum['SEARCHED']:
                sheet_data = get_searched_sheet_data( sheet['data'] );
                sheet_data = make_tree_fun( sheet_data );
                break;
        };
        
        return sheet_data;
    };

//  P R I V A T E   I N T E R F A C E

    // Make list of groups of sheets.
    function group_sheets( sheets, ids ) {
        var has_group = function( group_id ) {
            var filtered_groups = groups.filter( function( group ) {
                return group['group_id'] === group_id;
            });
            
            return filtered_groups.length > 0;
        };
        var get_group = function( group_id ) {
            var filtered_groups = groups.filter( function( group ) {
                return group['group_id'] === group_id;
            });
            
            return filtered_groups[0];
        };
        var groups = [];
        var group;
        
        // For each sheet: if sheet does not have a group, create it.
        // Then push sheet description on the list of sheets in the group.
        // Return list of groups.
        sheets.forEach( function( sheet, i ) {
            if ( !has_group( sheet['group_id'] ) ) {
                groups.push({
                    'group_id': sheet['group_id'],
                    'sheets'  : []
                });
            }
            group = get_group( sheet['group_id'] );
            
            group['sheets'].push({
                'sheet_id': ids[ i ],
                'sheet'   : sheet
            });
            
        });

        return groups;
    }
    
    // Make permalink data for one sheet, data_tree is data of sheet.
    function sheet_to_permalink( sheet, next_node_fun, is_filtered_fun ) {
        var permalink_object = {};
        var sheet_data;
        
        permalink_object['type'] = sheet['type'];
        permalink_object['label'] = sheet['label'];
        permalink_object['columns'] = sheet['columns'].map( function( column ) {
            return column['key'];
        });
        
        // Create sheet data depending on type of sheet.
        switch ( sheet['type'] ) {
            case _enum['STANDARD']:
                sheet_data = prepare_standard_sheet_data( sheet['sort_query'], next_node_fun );
                break;
            case _enum['FILTERED']:
                sheet_data = prepare_filtered_sheet_data( sheet['sort_query'], sheet['filter_query'],
                                                          next_node_fun );
                break;
            case _enum['SEARCHED']:
                sheet_data = prepare_searched_sheet_data( sheet['query'], sheet['boxes'] );
                break;
        };
        permalink_object['data'] = sheet_data;
        
        return permalink_object;
    }
    
    // Prepare sheet data when permalink is created.
    // Sheet data in standard permalink is a list of special nodes.
    // Find needed nodes to place them in permalink data. Those nodes are
    // parents of leaves and if there are two nodes that are in the same
    // branch.
    function prepare_standard_sheet_data( sort_query, next_node_fun ) {
        var data_list = [];
        var leaves = {};
        var leaves_parents = {};
        var id;
        var id_list = [];
        var sorted_ids;
        var act_node = undefined;
        var sheet_data;
        
        while ( next_node_fun( act_node ) ) {
            act_node = next_node_fun( act_node );
            data_list.push( act_node );
        }
        
        // Find ids of leaves.
        data_list.forEach( function ( node ) {
            if ( !!node['parent'] ) {
                leaves[ node['parent'] ] = false;
            }
            leaves[ node['id'] ] = true;
        });
        
        // Build object with ids of parents of non top level leaves.
        data_list.filter( function( node ) {
            return leaves[ node['id'] ] && !!node['parent'];
                }).forEach( function ( node ) {
            leaves_parents[ node['parent'] ] = true;
        });
        
        // Create list of those ids.
        for ( id in leaves_parents ) {
            if ( leaves_parents.hasOwnProperty( id ) ) {
                id_list.push( parseInt( id ) );
            }
        }
        
        // Sort ids in ascendent order.
        sorted_ids = id_list.sort( function ( id1, id2 ) {
            return id1 - id2;
        });
        
        return {
            'ids': sorted_ids,
            'sort_query': sort_query
        };
    }
    
    // Prepare sheet data when permalink is created.
    // Sheet data in standard permalink is a list of filtered nodes.
    // Find them and group in boxes.
    function prepare_filtered_sheet_data( sort_query, filter_query, next_node_fun ) {
        var sheet_data;

        sheet_data = prepare_standard_sheet_data( sort_query, next_node_fun );
        sheet_data['filter_query'] = filter_query;
        
        return sheet_data;
    }
    
    // Prepare sheet data when permalink is created.
    // Searched permalink should contain information about search query
    // and states of boxes.
    function prepare_searched_sheet_data( query, boxes ) {
        var sheet_data = {};
        
        sheet_data['query'] = query;
        sheet_data['boxes'] = [];
        
        boxes.forEach( function ( box ) {
            var rows = box['rows'].map( function ( e ) {
                return e['id'];
            });
            
            return {
                'rows': rows,
                'context': box['context'],
                'breadcrumb': box['breadcrumb']
            };
        });
    }
    
    // Get nodes for standard sheet using passed functions.
    // Permalink_sheet_data contains information which nodes are needed.
    // Uses passed functions to get top level data, children nodes and ancestors.
    // Returns a list with nodes that need to be inserted into a tree.
    function get_standard_sheet_data( permalink_sheet_data, get_top_level_fun,
                                      get_children_fun, get_ancestors_fun ) {
        var get_branch = function( node_id ) {
            var new_rows = [];
            var ancestors_ids = get_ancestors_fun( node_id );
            ancestors_ids.push( node_id );
            
            ancestors_ids.forEach( function ( id ) {
                if ( !node_ids[ id ] ) {
                    new_rows = new_rows.concat( get_children_fun( id ) );
                    node_ids[ id ] = true;
                }
            });
            
            return new_rows;
        };
        var sheet_data = [];
        var node_ids = {};
        
        sheet_data = get_top_level_fun();
        
        permalink_sheet_data.forEach( function ( id ) {
            var branch_new_nodes = get_branch( id );
            sheet_data = sheet_data.concat( branch_new_nodes );
        });
        
        return sheet_data;
    }
    
    function get_filtered_sheet_data( boxes, get_top_level_fun,
                                      get_children_fun, get_ancestors_fun ) {
        var get_branch = function( node_id ) {
            var new_rows = [];
            var ancestors_ids = get_ancestors_fun( node_id );
            
            ancestors_ids.forEach( function ( id ) {
                if ( !node_ids[ id ] ) {
                    new_rows = new_rows.concat( get_children_fun( id ) );
                    node_ids[ id ] = true;
                }
            });
            
            return new_rows;
        };
        var sheet_data = [];
        var filtered_nodes = {};
        
        sheet_data = get_top_level_fun();
        
        boxes.forEach( function ( id_list ) {
            var branch_new_nodes = get_branch( id_list[0] );
            sheet_data = sheet_data.concat( branch_new_nodes );
        });
        
        boxes.forEach( function ( id_list ) {
            id_list.forEach( function ( id ) {
                filtered_nodes[ id ] = true;
            });
        });
        
        sheet_data.forEach( function ( node ) {
            node = filtered_nodes['filtered'];
        });
        
        return sheet_data;
    }
    
    function get_searched_sheet_data(boxes, get_top_level_fun, get_children_fun,
                                     get_ancestors_fun, get_node ) {
        // TODO: test it, prealpha version
        boxes.forEach( function ( box ) {
            var rows = box['ids'];
            var nodes_in_box = [];
            if (breadcrumb) {
                nodes_in_box.push( get_ancestors(rows[0]) );
            }
            if (context) {
                nodes_in_box = nodes_in_box.concat( get_children(get_parent(rows[0])) );
            } else {
                rows.forEach( function ( row ) {
                    nodes_in_box.push( row );
                });
            }
        });
        
        return nodes_in_box;
    }

    /*
    {
        endpoint_id: string/null,
        sheets: [
            {
                type: enum(integer),
                label: string,
                columns: [ visible_column_key1, visible_column_key2, ... ],
                sheet_data: <sheet_data>
            },
            ...
        ]
    }
    */

    return that;
}) ();
