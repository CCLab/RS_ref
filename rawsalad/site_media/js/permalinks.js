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
                var prepared_sheet = sheet_to_permalink( sheet, sheet_id, sheet['data'] );
                prepared_sheets.push( prepared_sheet );
            });
            
            permalink_data.push({
                'endpoint': endpoint,
                'sheets'  : prepared_sheets
            });
        });
        
        return permalink_data;
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
    function sheet_to_permalink( sheet, sheet_id, data_tree ) {
        var permalink_object = {};
        var sheet_data;
        
        permalink_object['type'] = sheet['type'];
        permalink_object['label'] = sheet['label'];
        permalink_object['columns'] = sheet['columns'].map( function( column ) {
            return column['key'];
        });
        permalink_object['data'] = prepare_sheet_data( data_tree, sheet['type'] );
        
        return permalink_object;
    }
    
    // Create sheet data depending on type of sheet.
    function prepare_sheet_data( data_tree, type ) {
        var sheet_data;
        
        switch ( type ) {
            case _enum['STANDARD']:
                sheet_data = prepare_standard_sheet_data( data_tree );
                break;
            case _enum['FILTERED']:
                sheet_data = prepare_filtered_sheet_data( data_tree );
                break;
            case _enum['SEARCHED']:
                sheet_data = prepare_searched_sheet_data( data_tree );
                break;
        };
        
        return sheet_data;
    }
    
    // Sheet data in standard permalink is a list of special nodes.
    // Find needed nodes to place them in permalink data. Those nodes are
    // parents of leaves and if there are two nodes that are in the same
    // branch.
    function prepare_standard_sheet_data( data_tree ) {
        var data_list = _tree.tree_to_list( data_tree );
        var leaves = {};
        var leaves_parents = {};
        var id;
        var id_list = [];
        var sorted_ids;
        
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
        
        return sorted_ids;
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
