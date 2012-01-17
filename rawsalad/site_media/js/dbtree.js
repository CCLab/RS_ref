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

var _dbtree = (function () {

// P U B L I C   I N T E R F A C E
    var that = {};
    
    that.draw_db_tree_panels = function( data ) {
        var tree_panel = '';
        var choose_panel = $('#pl-ch-datasets'); 
        var choose_list = $( Mustache.to_html( _templates.tree_list, { 'even': false, } ) );
        add_tree_node( data, '', choose_list, true );
        prepare_tree_interface( choose_list );
                
        choose_panel.append( choose_list );
        console.log( data );        
    };

// P R I V A T E   I N T E R F A C E
        
    function draw_db_tree_panels( data ) {
        var tree_panel = '';
        var choose_panel = $('#pl-ch-datasets'); 
        var choose_list = $( Mustache.to_html( _templates.tree_list, { 'even': false, } ) );
        add_tree_node( data, '', choose_list, true );
        prepare_tree_interface( choose_list );
                
        choose_panel.append( choose_list );
        console.log( data );        
    }


    function add_tree_node( data, parent_id, choose_list, even ){
        var id = parent_id; 
        var html;
        var children = get_tree_children( data, id );
        
        children.forEach( function( node ) {        
            var max_depth = node['max_depth'];
            
            switch ( max_depth ) {
                case 1:
                    html = add_one_to_dbtree( node, data );
                    break;
                case 2 :
                    html = add_two_to_dbtree( node, data );
                    break;
                default:
                    var new_placeholder ;
                    var even_level = { 'even': even, };
                    var list_code = $( Mustache.to_html( _templates.tree_list, even_level ) );

                    html = $( Mustache.to_html( _templates.tree_node, node ) );                                
                    new_placeholder = html.find( '.pl-tree' );
                    new_placeholder.append( list_code );
                    add_tree_node( data, node['id'], list_code, ! even );
            } ;
            choose_list.append( html );
        } );
    }

    
    function get_tree_children( data, id ){
        var children = data.filter( function( node ) {
            return node['parent'] === id;
        } );
        return children;         
    }
    

    // TODO remove redundancy from add_two, add_one and add_tree_node
    function add_one_to_dbtree( node, data ) {
        
        var nodes_leafs = prepare_ends( node, data );
        var html = Mustache.to_html( _templates.double_end, nodes_leafs )
        var html_code = $(html);
        return html_code;
    }



    function add_two_to_dbtree( node, data ) {
    
        var html = Mustache.to_html( _templates.tree_node, node );
        var html_code = $(html);
        var table_placeholder = html_code.find( '.pl-tree-end-det' );
        var nodes_leafs = prepare_ends( node, data, true );
        var end = Mustache.to_html( _templates.double_end, nodes_leafs )
        
        table_placeholder.append( end );
        
        return html_code;    
    }
    

    function prepare_ends( node, data, double_level ) {
        var parent_id = node['id'];
        var level_one = ( !! double_level ) ? get_tree_children( data, parent_id ) : [ node ];
        var end_points = [];
        var end_names = [];
        
        level_one.forEach( function( node ) {
            end_points.push( get_tree_children( data, node['id'] )[0] );
        } );
                
        end_points.forEach( function( node ) {
            var node_name = node['name'];
            if ( !!node['endpoint'] &&  ! is_in_array( end_names, node_name ) ) {
                end_names.push( node_name );
            } 
        });

        end_names.sort();                
        
        level_one.forEach( function( node ) {
            var children = get_tree_children( end_points, node['id'] );
            var list = [];
            node['children'] = [];            
            end_names.forEach( function ( end_name ) {
                list.push( { 'end': get_node_by_name( children, end_name ), } );
            } );            
            node['children'] = list;
        } );
        
        end_names = end_names.map( function( name ) {
            return { 'name': name, };
        } );        
     
        return {
                'end_names': end_names,
                'nodes': level_one,        
                }    
    }
    

    function get_node_by_name( children, end_name ) {
        var i;
        for ( i= 0; i < children.length; i++ ) {
            if ( children[i]['name'] === end_name ) {
                return children[i];
            }
        }
        return false;   
    }    
    

    function is_in_array( list, string ){
        var i;
        for ( i = 0; i < list.length; i++ ) {
            if ( string === list[i] ) {
                return true;
            }
        }
        return false;
    }


    // P R E A P A R E   I N T E R F A C E   F U N C T I O N S
    function prepare_tree_interface( tree_code ) {
        var tree_arow = tree_code.find( '.pl-tree-arrow' );
        var uchecked_endpoints = tree_code.find( '.pl-tree-end-unchecked' );
        var unchecked_nodes = tree_code.find( '.pl-tree-node-unchecked' );
        
        tree_arow
            .click( show_next_level );

        unchecked_nodes.
            click( function () {
                select_node( $(this) );
            } );
            
        uchecked_endpoints
            .click( check_endpoint );
    }


    // E V E N T S
    function check_endpoint() {
        var node_det = $(this).closest( '.pl-tree' );
        var node_checkbox = node_det.prev( 'div.pl-tree-node' );

        $(this)
            .removeClass( 'pl-tree-end-unchecked' )
            .addClass( 'pl-tree-end-checked' )
            .unbind( 'click' )
            .click( uncheck_endpoint );
            
       check_parent_nodes( node_checkbox );     
    }

    
    function uncheck_endpoint() {
        var node_det = $(this).closest( '.pl-tree' );
        var node_checkbox = node_det.prev( 'div.pl-tree-node' );

        $(this)
            .removeClass( 'pl-tree-end-checked' )
            .addClass( 'pl-tree-end-unchecked' )
            .unbind( 'click' )
            .click( check_endpoint );

        uncheck_parent_nodes( node_checkbox )
    };

    
    // TODO uncheck_parent_nodes and check_parent_nodes in one ???
    function uncheck_parent_nodes( node_checkbox ) {
        if ( node_checkbox.hasClass( 'pl-tree-node-checked' ) ) {
            var parent_node = node_checkbox.closest( 'section.pl-tree' );
            uncheck_node( node_checkbox );
            if ( parent_node.length === 1 ) {
                 var new_checkbox = parent_node.prev( 'div.pl-tree-node' );
                 uncheck_parent_nodes( new_checkbox );            
            }
        }
    };


    function check_parent_nodes( node_checkbox ) {
        var node_list = node_checkbox.parent();
        var unmark_ends = node_list.find( '.pl-tree-end-unchecked' );
        
        if ( ( unmark_ends.length === 0 ) &&
             ( node_checkbox.hasClass( 'pl-tree-node-unchecked' ) ) ){
                 
             var parent_node = node_checkbox.closest( 'section.pl-tree' );
             check_node( node_checkbox );                 
                 
             if ( parent_node.length === 1 ) {
                 var new_checkbox = parent_node.prev( 'div.pl-tree-node' );
                 check_parent_nodes( new_checkbox );
             }
        }
    }
    
    
    function select_node( node_checkbox ) {
        var node_child = node_checkbox.next( 'section.pl-tree' );
        var unmark_ends = node_child.find( '.pl-tree-end-unchecked' );
        
        unmark_ends.trigger( 'click' );
    }


    function unselect_node( node_checkbox ) {
        var node_child = node_checkbox.next( 'section.pl-tree' );
        var mark_ends = node_child.find( '.pl-tree-end-checked' );
        
        mark_ends.trigger( 'click' );
    }

    
    function uncheck_node( node_checkbox ) {
        node_checkbox
            .removeClass( 'pl-tree-node-checked' )
            .addClass( 'pl-tree-node-unchecked' )
            .unbind( 'click' )
            .click( function() {
                select_node( node_checkbox );
            });
    }


    function check_node( node_checkbox ) {
        node_checkbox
            .removeClass( 'pl-tree-node-unchecked' )
            .addClass( 'pl-tree-node-checked' )
            .unbind( 'click' )
            .click( function() {
                unselect_node( node_checkbox );
            });
    }

    
    function show_next_level(){
	    $(this).parent( '.pl-tree' ).addClass( 'pl-tree-det' );
//	    $(this).addClass( 'open' ); TODO ask Blazej about this
    	$(this).prev().show();
	    $(this).siblings( '.pl-tree-node-info' ).find( '.pl-tree-node-des' ).css({ display: "none" });
	    $(this).siblings( '.pl-tree-end-det' ).css({ display: "block" });
	    $(this).siblings( '.pl-tree-pointer' ).css({ display: "inline-block" });
	    $(this).attr('src', '/site_media/img/triangle-down.png' );
	    $(this).unbind( 'click' ).click( hide_level );// TODO - hide
    }
    
    
    function hide_level(){
        var current_level = $(this).parent( '.pl-tree' )
        
//        $(this).removeClass( 'open' ); // TODO ask Blazej about this
//        var others = $(this).siblings( 'ul' ).find( 'open' );
//        others.trigger( 'click' );

	    $(this).prev().hide();
	    $(this).siblings('.pl-tree-node-info').find('.pl-sr-tree-node-des').css({ display: "block" });
	    $(this).siblings('.pl-tree-end-det').css({ display: 'none' });

        current_level.removeClass('pl-tree-det');
        current_level.find('pl-tree-det').trigger( 'click' );
        
	    $(this).attr('src', '/site_media/img/triangle.png' );
	    $(this).unbind( 'click' ).click( show_next_level );
    }

   
    // return public interface
    return that;

})();
