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
    that.prepare_permalink = function( sheets, ids ) {
        var permalink_data = [];
        var grouped_sheets = group_sheets( sheets, ids );
        
        grouped_sheets.forEach( function ( group ) {
            var prepared_sheets = [];
            var endpoint;
            
            group['sheets'].forEach( function ( sheet_info ) {
                var sheet_id = sheet_info['sheet_id'];
                var sheet = sheet_info['sheet'];
                
                endpoint = sheet['endpoint'];
                var prepared_sheet = sheet_to_permalink( sheet );
                prepared_sheets.push( prepared_sheet );
            });
            
            permalink_data.push({
                'endpoint': endpoint,
                'sheets'  : prepared_sheets
            });
        });
        
        return permalink_data;
    };
    
    that.restore_sheet_data = function( sheet, data_tree ) {
        var sheet_data;
        var tree;
        var sorted_tree;
        var sheet_tree;
        
        switch ( sheet['type'] ) {
            case _enum['STANDARD']:
                sheet_data = restore_standard_sheet_data( data_tree, sheet['data'] );
                break;
            case _enum['FILTERED']:
                sheet_data = restore_filtered_sheet_data( data_tree, sheet['data'] );
                break;
            case _enum['SEARCHED']:
                sheet_data = restore_searched_sheet_data( data_tree, sheet['data'] );
                break;
            default:
                throw 'Bad sheet type';
        };
        
        return _tree.tree_to_list( sheet_data );
    };
    
    // Obtain additional fields that depend on type of a sheet.
    that.get_additional_fields = function( permalink_sheet ) {
        var additional_fields = {};
        
        switch ( permalink_sheet['type'] ) {
            case _enum['STANDARD']:
                additional_fields['sort_query'] = permalink_sheet['data']['sort_query'];
                break;
            case _enum['FILTERED']:
                additional_fields['sort_query'] = permalink_sheet['data']['sort_query'];
                additional_fields['filter_query'] = permalink_sheet['data']['filter_query'];
                break;
            case _enum['SEARCHED']:
                additional_fields['query'] = permalink_sheet['data']['query'];
                additional_fields['boxes'] = permalink_sheet['data']['boxes'];
                break;
            default:
                throw 'Bad sheet type';
        };
        
        return additional_fields;
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
    function sheet_to_permalink( sheet ) {
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
                sheet_data = prepare_standard_sheet_data( sheet );
                break;
            case _enum['FILTERED']:
                sheet_data = prepare_filtered_sheet_data( sheet );
                break;
            case _enum['SEARCHED']:
                sheet_data = prepare_searched_sheet_data( sheet );
                break;
            default:
                throw 'Bad sheet type';
        };
        permalink_object['data'] = sheet_data;
        
        return permalink_object;
    }
    
    // Prepare sheet data when permalink is created.
    // Sheet data in standard permalink is a list of special nodes.
    // Find needed nodes to place them in permalink data. Those nodes are
    // parents of leaves and if there are two nodes that are in the same
    // branch.
    function prepare_standard_sheet_data( sheet ) {
        var id_list = [];
        var sorted_ids;
        var act_node = undefined;
        var id;
        var parent;
        var grandparent;
        
        var visited = {};  // ids of visited nodes( map: id->parent )
        var needed = {};   // nodes needed in permalink
        var unneeded = {}; // nodes that were needed in permalink
        
        while ( _tree.next_node( sheet['data'], act_node ) ) {
            act_node = _tree.next_node( sheet['data'], act_node );
            id = act_node['id'];
            parent = act_node['parent'];
            
            visited[ id ] = parent;
            if ( !!parent && !needed[ parent ] ) {
                if ( !unneeded[ parent ] ) {
                    // if parent of this node should be added to needed list
                    grandparent = visited[ parent ];
                    // if grandparent of this node should be removed from the list
                    if ( grandparent !== undefined && needed[ grandparent ] ) {
                        delete needed[ grandparent ];
                        unneeded[ grandparent ] = true;
                    }
                    needed[ parent ] = true;
                }
            }
        }
        
        // Create list of those needed ids in permalink.
        for ( id in needed ) {
            if ( needed.hasOwnProperty( id ) ) {
                id_list.push( parseInt( id ) );
            }
        }
        
        // Sort ids in ascendent order.
        sorted_ids = id_list.sort( function ( id1, id2 ) {
            return id1 - id2;
        });
        
        return {
            'ids'       : sorted_ids,
            'sort_query': sheet['sort_query']
        };
    }
    
    // Prepare sheet data when permalink is created.
    // Sheet data in standard permalink is a list of filtered nodes.
    // Find them and group in boxes.
    function prepare_filtered_sheet_data( sheet ) {
        var sheet_data;

        sheet_data = prepare_standard_sheet_data( sheet );
        sheet_data['filter_query'] = sheet['filter_query'];
        
        return sheet_data;
    }
    
    // Prepare sheet data when permalink is created.
    // Searched permalink should contain information about search query
    // and states of boxes.
    function prepare_searched_sheet_data( sheet ) {
        var sheet_data = {
            'query': sheet['query'],
            'boxes': []
        };
        
        sheet['boxes'].forEach( function ( box ) {
            var rows = box['rows'].map( function ( e ) {
                return e['id'];
            });
            
            sheet_data['boxes'].push({
                'rows': rows,
                'context': box['context'],
                'breadcrumb': box['breadcrumb']
            });
        });
        
        return sheet_data;
    }
    
    // Get nodes for standard sheet using passed functions.
    // sheet_info contains information which nodes are needed.
    // Returns tree with nodes that need to be inserted into a tree.
    function restore_standard_sheet_data( data_tree, sheet_data, query_to_fun ) {
        var get_branch = function( node_id ) {
            var new_rows = [];
            var ancestors = _tree.get_parents( data_tree, node_id );
            var ancestors_ids = ancestors.map( function ( node ) {
                return node['id'];
            });
            ancestors_ids.push( node_id );
            
            ancestors_ids.forEach( function ( id ) {
                if ( !node_ids[ id ] ) {
                    new_rows = new_rows.concat( _tree.get_children_nodes( data_tree, id ) );
                    node_ids[ id ] = true;
                }
            });
            
            return new_rows;
        };
        var sheet_tree;
        var sheet_nodes = [];
        var node_ids = {};
        
        sheet_nodes = _tree.get_children_nodes( data_tree );
        
        sheet_data['ids'].forEach( function ( id ) {
            var branch_new_nodes = get_branch( id );
            sheet_nodes = sheet_nodes.concat( branch_new_nodes );
        });
        sheet_tree = _tree.create_tree( sheet_nodes, 'id', 'parent' );
        
        return sheet_tree;
    }
    
    function restore_filtered_sheet_data( data_tree, sheet_data ) {
        return restore_standard_sheet_data( data_tree, sheet_data );
    }
    
    function restore_searched_sheet_data( data_tree, sheet_data ) {
        var boxes = sheet_data['boxes'];
        var sheet_nodes = [];
        
        // TODO: test it, prealpha version
        boxes.forEach( function ( box ) {
            var rows = box['rows'];
            var nodes_in_box = [];
            var ancestors;
            var children;
            
            ancestors = _tree.get_parents( data_tree, rows[0]['id'] );
            nodes_in_box = ancestors;
            
            if ( box['context'] ) {
                children = _tree.get_children_nodes( data_tree, ancestors[0] );
                nodes_in_box = nodes_in_box.concat( children );
            } else {
                box['rows'].forEach( function ( row ) {
                    var node = _tree.get_node( data_tree, row['id'] );
                    nodes_in_box.push( node );
                });
            }
            sheet_nodes = sheet_nodes.concat( nodes_in_box );
        });
        
        return _tree.create_tree( sheet_nodes, 'id', 'parent' );
    }

    return that;
}) ();
