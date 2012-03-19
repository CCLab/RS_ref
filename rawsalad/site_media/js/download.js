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

var _download = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};
    
    // Prepare object that will be sent to the server and will be
    // used to get download data from db.
    that.prepare_download_data = function( sheets, endpoints ) {
        var download_json = [];
        
        sheets.forEach( function ( sheet ) {
            download_json.push( prepare_sheet( sheet ) );
        });
        
        endpoints.forEach( function( endpoint ) {
            download_json.push( prepare_endpoint( endpoint ) );
        });
        
        return JSON.stringify( download_json );
    }
    
    return that;
    
    
//  P R I V A T E   I N T E R F A C E

    function prepare_sheet( sheet ) {
        var ids = get_ids_in_sheet( sheet );
        var column_names = sheet['columns'].map( function ( column ) {
            return column['key'];
        });
        
        return {
            'endpoint': sheet['endpoint'],
            'ids'     : ids,
            'columns' : column_names
        };
    }
    
    function prepare_endpoint( endpoint ) {
        return {
            'endpoint': endpoint
        };
    }
    
    function get_ids_in_sheet( sheet ) {
        var ids;
        
        switch ( sheet['type'] ) {
            case _enum['STANDARD']:
                ids = get_ids_standard_sheet( sheet['data'] );
                break;
            case _enum['FILTERED']:
                ids = get_ids_filtered_sheet( sheet['data'] );
                break;
            case _enum['SEARCHED']:
                ids = get_ids_searched_sheet( sheet['data'], sheet['boxes'] );
                break;
            default:
                throw 'Bad sheet type in download';
        }
        
        return ids;
    }
    
    function get_ids_standard_sheet( data ) {
        var ids = [];
        
        _tree.iterate( data, function ( node ) {
            ids.push( node['id'] );
        });
        
        return ids;
    }
    
    function get_ids_filtered_sheet( data ) {
        var ids = [];
        
        _tree.iterate( data, function ( node ) {
            ids.push( node['id'] );
        });
        
        return ids;
    }
    
    function get_ids_searched_sheet( data, boxes ) {
        var ids = [];
        var needed_ids = {};
        var parent;
        var node;
        var nodes;
        
        // find which nodes are needed and remember them
        boxes.forEach( function ( box ) {
            if ( box['context'] ) {
                // all nodes on this level are needed
                node = _tree.get_node( data, box['rows'][0]['id'] );
                parent = _tree.get_node( data, node['parent'] );
                nodes = _tree.get_children_nodes( data, parent );
                nodes.forEach( function ( node ) {
                    needed_ids[ node['id'] ] = true;
                });
            } else {
                // only searched nodes on this level are needed
                box['rows'].forEach( function ( node ) {
                    needed_ids[ node['id'] ] = true;
                });
            }
            
            if ( box['breadcrumb'] ) {
                // all ancestors are needed
                node = _tree.get_node( data, box['rows'][0]['id'] );
                nodes = _tree.get_parents( data, node );
                nodes.forEach( function ( node ) {
                    needed_ids[ node['id'] ] = true;
                });
            }
        });
        
        data.iterate( function ( node ) {
            if ( !!needed_ids[ node['id'] ] ) {
                ids.push( node['id'] );
            }
        });
        
        return ids;
    }
    
})();
