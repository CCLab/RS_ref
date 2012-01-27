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

// T R E E  I N T E R F A C E  T O  M O N K E Y
var _tree = (function () {
    var that = {};

    that.create_tree = function( data_list, id, parent_id ) {
        return (!!parent_id ) ? monkey.createTree( data_list, id, parent_id ) :
                                monkey.createTree( data_list, id );
    };
    
    
    that.get_node = function( tree, id ) {
        return tree.getNode( id );
    };
    
    that.get_top_parent = function( tree, id ) {
        return tree.topParent( id, true );
    };
    
    that.root = function( tree ) {
        return tree.root();
    };
    
    that.has_node = function( tree, id ) {
        return !!that.get_node( tree, id );
    };
    
    that.right_node = function( tree, id ) {
        return tree.rightSibling( id );
    };
    
    that.get_children_nodes = function( tree, parent_id ) {
        if ( parent_id === undefined ) {
            parent_id = tree.root();
        }
        return tree.children( parent_id, true );
    };
    
    that.get_parents = function( tree, id ) {
        return tree.parents( id, true );
    };
    
    
    that.insert_node = function( tree, node ) {
        return tree.insertNode( node );
    };
    
    that.update_tree = function( tree, data ) {
        return tree.updateTree( data );
    };
    
    that.remove_node = function( tree, id ) {
        return tree.removeNode( id );
    };
    
    // iterates over tree and returns array of nodes
    that.tree_to_list = function( tree ) {
        return tree.toList(true);
    };
    
    // returns list even with filtered nodes
    that.all_tree_to_list = function( tree ) {
        return tree.toList( true );
    };
    
    that.next_node = function( tree, node ) {
        return tree.next( node );
    };
    
    that.iterate = function( tree, fun, first, end ) {
        tree.iterate( fun, first, end );
    };
    
    that.get_children_number = function( tree, parent_id ) {
        if ( parent_id === undefined ) {
            parent_id = tree.rootId();
        }
        return tree.children( parent_id ).length;
    };
    
    that.sort = function( tree, sort_fun ) {
        return tree.sort( sort_fun );
    };
    
    that.filter = function( tree, filter_fun ) {
        return tree.filter( filter_fun );
    };
    
    that.is_filtered = function( tree, node ) {
        return tree.isNodeFiltered( node );
    };
    
    that.get_filtered_nodes = function( tree ) {
        var filtered_nodes = [];
        
        tree.forEach( function ( node ) {
            if ( tree.isNodeFiltered( node ) ) {
                filtered_nodes.push( tree.value( node ) );
            }
        });
        
        return filtered_nodes;
    };

    return that;
}) ();
