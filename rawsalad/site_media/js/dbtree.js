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

    // Draw tree that shows available collections.
    // TODO get rid of side-effects - return ready to use html instead!
    that.get_dbtree = function( db_tree, header, callback ) {
        // Generate html code for node and his children.
        var generate_high_level_node = function ( node, even ) {
            var children_code = _tree
                .get_children_nodes( db_tree, node['id'] )
                .map( function( n ) {
                    if ( is_high_level( n ) ) {
                        return generate_high_level_node( n, !even );
                    } else {
                        return generate_leaf( n, !even );
                    }
                });
            var html_info = {
                'id'         : node['id'],
                'even'       : even,
                'parent_id'  : _tree.get_parent_id( db_tree, node['id'] ),
                'name'       : node['name'],
                'description': node['description'],
                'children'   : children_code,
                'even'       : even
            };

            return Mustache.to_html( _tmpl.dbtree_high, html_info );
        }

        // Generate html code for leaf => table with endpoints.
        var generate_leaf = function ( node, even ) {
            var header_list = _tree
                .get_children_nodes( db_tree, node['id'] )
                .map( function ( n ) {
                    return n['name'];
                });
            var children_list = _tree
                .get_children_nodes( db_tree, node['id'] )
                .map( function ( n ) {
                    return {
                        'endpoint': n['endpoint'],
                        'id'      : n['id']
                    };
                });
            var html_info = {
                'parent_id': _tree.get_parent_id( db_tree, node['id'] ),
                'even'     : even,
                'header'   : header_list,
                'name'     : node['name'],
                'children' : children_list
            };

            return Mustache.to_html( _tmpl.dbtree_leaf, html_info );
        }

        var db_tree_code;
        var root = _tree.root( db_tree );
        var top_level_nodes = _tree
            .get_children_nodes( db_tree, root['id'] )
            .map( function ( n ) {
                if ( is_high_level( n ) ) {
                    return generate_high_level_node( n, true );
                } else {
                    return generate_leaf( n, true );
                }
            });

        var html_info = {
            'header'  : header,
            'children': top_level_nodes
        };

        db_tree_code = Mustache.to_html( _tmpl.dbtree_root, html_info );

        $('#pl-ch-area').empty().append('<div id="pl-ch-datasets" class="panel-main"></div>');
        $('#pl-ch-datasets').empty().append( db_tree_code );
        prepare_dbtree_interface( db_tree, callback );
    };

    that.get_selected_endpoints = function() {
        var values = [];

        $('.pl-tree-end-checkbox').each( function ( i, e ) {
            var checkbox = $(e);
            if ( checkbox.hasClass('pl-tree-end-checked') ) {
                values.push( checkbox.attr('endpoint') );
            }
        });

        return values;
    };



    that.draw_db_tree = function( data, submit_name, callback ) {
        var choose_panel = $('#pl-ch-datasets').empty();
        var choose_panel_code;
        var choose_list_code;

        // 'even' - for ".pl-tree" background colors changes
        var even_level = {
            'even'        : false,
            'button'      : true,
            'button_name' : submit_name || 'Wyświetl',
        };

        // prepare place for dbtree list elements
        panel_content = Mustache.to_html( _tmpl.tree_list, even_level );
        panel_content_code = $(panel_content);
        choose_list_code = panel_content_code.closest('ul');

        // generate dbtree code
        // '' - root level
        // true - for CSS ".pl-tree" background colours changes
        add_tree_node( data, '', choose_list_code, true );

        prepare_tree_interface( panel_content_code, callback );

        // add to page
        choose_panel.append( panel_content_code );
    };

// P R I V A T E   I N T E R F A C E

    function is_high_level( node ) {
        return node['max_depth'] >= 2;
    }

    function prepare_dbtree_interface( db_tree, callback ) {
        // Hiding and showing children of higher level nodes.
        $('.pl-tree-arrow').click( function () {
            var id = $(this).attr('id');
            $('#' + id + '-children').toggle();

            if( $(this).css('background-image').indexOf('left') !== -1 ) {
                $(this).css('background-image','url("/site_media/img/arrow_down.png")');
            }
            else {
                $(this).css('background-image','url("/site_media/img/arrow_left.png")');
            }
        });

        // Handle checkboxes selection in dbtree.
        $('.pl-tree-node').click( function () {
            handle_checkbox_selection( db_tree, $(this) );
        });

        $('.pl-tree-end-checkbox').click( function () {
            handle_checkbox_selection( db_tree, $(this) );
        });

        $('#pl-ch-submit').click( function () {
            var selected_endpoints = that.get_selected_endpoints();
            callback( selected_endpoints );
        });
    }

    // Select/deselect checkbox and checkboxes in subtree,
    // update parent checkboxes.
    function handle_checkbox_selection( db_tree, this_node ) {
        var html_id = this_node.attr('id');
        var id = parseInt( html_id.split('-')[1] );
        var parent_id = get_dbtree_parent_id( db_tree, id );
        if ( this_node.hasClass('pl-tree-end-checked') ||
             this_node.hasClass('pl-tree-node-checked') ) {
            _tree.inSubtreeDo( db_tree, id, uncheck_box );
        } else {
            _tree.inSubtreeDo( db_tree, id, check_box );
        }
        update_parent_selection( db_tree, parent_id );
    }

    // Return id of nodes parent in dbtree.
    function get_dbtree_parent_id ( db_tree, id ) {
        var node = _tree.get_node( db_tree, id );
        var parent_id = _tree.get_parent_id( db_tree, id );

        // If it is endpoint, then grandparent id should be returned, since
        // direct parent is not showed in dbtree.
        if ( node['min_depth'] === 0 ) {
            return _tree.get_parent_id( db_tree, parent_id );
        } else {
            return parent_id;
        }
    }

    // Return true if all endpoints in the subtree are selected, otherwise false.
    function is_subtree_selected( db_tree, subtree_root_id ) {
        function is_any_not_selected( node ) {
            if ( is_not_selected_endpoint( db_tree, node ) ) {
                all_subtree_selected = false;
            }
        }
        function is_not_selected_endpoint( db_tree, node ) {
            if ( _tree.get_children_number( db_tree, node['id'] ) === 0 ) {
                if ( $('#endpoint-' + node['id']).hasClass('pl-tree-end-unchecked') ) {
                    return true;
                }
                return false;
            }
            return false;
        }
        var all_subtree_selected = true;

        _tree.inSubtreeDo( db_tree, subtree_root_id, is_any_not_selected );

        return all_subtree_selected;
    }

    // Recursively update parents selection.
    function update_parent_selection( db_tree, parent_id ) {
        if ( !parent_id ) {
            return;
        }

        var parent_node = $('#node-' + parent_id + '-check');
        var higher_parent_id;

        if ( is_subtree_selected( db_tree, parent_id ) ) {
            parent_node.removeClass('pl-tree-node-unchecked')
                       .addClass('pl-tree-node-checked');
        } else {
            parent_node.removeClass('pl-tree-node-checked')
                       .addClass('pl-tree-node-unchecked');
        }

        higher_parent_id = _tree.get_parent_id( db_tree, parent_id );
        update_parent_selection( db_tree, higher_parent_id );
    }

    function check_box( dbtree_node ) {
        change_check_box( dbtree_node, 'on' );
    }

    function uncheck_box( dbtree_node ) {
        change_check_box( dbtree_node, 'off' );
    }

    // Toggle higher node or endpoint checkbox selection.
    function change_check_box( dbtree_node, new_state ) {
        var node_id = dbtree_node['id'];
        var node = $('#node-' + node_id + '-check');
        if ( !node.length ) {
            node = $('#endpoint-' + node_id);
            if ( new_state === 'off' ) {
                node.removeClass('pl-tree-end-checked')
                    .addClass('pl-tree-end-unchecked');
            } else {
                node.removeClass('pl-tree-end-unchecked')
                    .addClass('pl-tree-end-checked');
            }
        } else {
            if ( new_state === 'off' ) {
                node.removeClass('pl-tree-node-checked')
                    .addClass('pl-tree-node-unchecked');
            } else {
                node.removeClass('pl-tree-node-unchecked')
                    .addClass('pl-tree-node-checked');
            }
        }
    }



    function add_tree_node( data, id, choose_list, even ){
        var html;
        var children;

        // get all children of id node
        children = get_tree_children( data, id );

        children.forEach( function( node ) {
            var max_depth = node['max_depth'];

            switch ( max_depth ) {
                case 1:
                    // 1 - generate one level table
                    html = endpoints_table( node, data, 1 );
                    break;
                case 2 :
                    // 2 - generate two levels table
                    html = endpoints_table( node, data, 2 );
                    break;
                default:
                    // add new node to dbtree
                    var new_list;
                    var new_list_code
                    var new_placeholder;
                    var even_level = { 'even': even, };

                    // prepare place for new dbtree list
                    new_list = Mustache.to_html( _tmpl.tree_list, even_level );
                    new_list_code = $(new_list);

                    // generate new node code
                    html = $( Mustache.to_html( _tmpl.tree_node, node ) );

                    // get place for new dbtree list
                    new_placeholder = html.find( '.pl-tree' );
                    new_placeholder.append( new_list_code );

                    //generate next level of dbtree
                    // 'even' - for ".pl-tree" background colours changes
                    add_tree_node( data, node['id'], new_list_code, ! even );
            } ;
            // add list element to dbtree
            choose_list.append( html );
        } );
    }


    // generate endpoints table
    function endpoints_table( node, data, levels ) {
        var html_code;
        var nodes_leafs = prepare_ends( node, data, levels );
        var ends = Mustache.to_html( _tmpl.double_end, nodes_leafs );

        // levels === 1 - generate one level table
        if ( levels === 1 ) {
            html_code = $(ends);
        }
        // levels === 2 - generate two levels table
        else if ( levels === 2 ) {
            var table_placeholder;
            var html = Mustache.to_html( _tmpl.tree_node, node );
            html_code = $(html);
            table_placeholder = html_code.find( '.pl-tree-end-det' );
            table_placeholder.append( ends );
        }
        return html_code;
    }


    // prepare object for double_end Mustache template
    function prepare_ends( node, data, levels ) {
        var parent_id = node['id'];
        var level_one = ( levels === 2 ) ? get_tree_children( data, parent_id ) : [ node ];
        var end_points = [];
        var end_names = [];

        level_one.forEach( function( node ) {
            end_points.push( get_tree_children( data, node['id'] )[0] );
        } );

        // prepare end_name list of unique node names
        end_points.forEach( function( node ) {
            var node_name = node['name'];
            if ( !!node['endpoint'] &&  ! is_in_array( end_names, node_name ) ) {
                end_names.push( node_name );
            }
        });
        end_names.sort();

        // prepare nodes object for template
        level_one.forEach( function( node ) {
            var children = get_tree_children( end_points, node['id'] );
            var list = [];
            end_names.forEach( function ( end_name ) {
                list.push( { 'end': get_node_by_name( children, end_name ), } );
            } );
            node['children'] = list;
        } );

        // prepare end_names object for template
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


    function get_tree_children( data, id ){
        var children = data.filter( function( node ) {
            return node['parent'] === id;
        } );
        return children;
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
    function prepare_tree_interface( tree_code, callback ) {
        // get html elements
        var tree_arow = tree_code.find( '.pl-tree-arrow' );
        var uchecked_endpoints = tree_code.find( '.pl-tree-end-unchecked' );
        var unchecked_nodes = tree_code.find( '.pl-tree-node-unchecked' );
        var submit_button = tree_code.closest( 'div.button' )

        // add 'click' events to html elements
        tree_arow
            .click( show_next_level );

        unchecked_nodes
            .click( select_node );

        uchecked_endpoints
            .click( check_endpoint );

        submit_button.
            click( function () {
                // collect checked endpoints and pass them to callback
                var boxes = $('#pl-ch-datasets').find('.pl-tree-end-checked');
                // TODO how to map over jQuery objects returning Array, not jQuery Array
                var endpoints = $.makeArray( boxes.map( function ( e ) {
                                    return $(this).attr('data-endpoint');
                                }));

                // in case nothing was selected
                if( !endpoints.length ) {
                    console.log( "Proszę wybrać choć jedną kolekcję danych" );
                    return;
                }

                callback( endpoints );
            });
    }


    // E V E N T S
    function show_next_level(){
	    $(this).parent( '.pl-tree' ).addClass( 'pl-tree-det' );

	    $(this).siblings( '.pl-tree-node-info' )
	        .find( '.pl-tree-node-des' )
	        .css({ display: "none" });

	    $(this).siblings( '.pl-tree-end-det' )
	        .css({ display: "block" });

	    $(this).siblings( '.pl-tree-pointer' )
	        .css({ display: "inline-block" });

	    $(this).siblings( '.pl-tree-list' )
	        .children( 'li' )
	        .children( 'section.pl-tree' )
	        .children( 'img.pl-tree-pointer' )
	        .css({ display: "inline-block" });

	    $(this)
	        .unbind( 'click' )
	        .click( hide_level );
    }


    function hide_level(){
        var open_children;

        // close deeper levels
        open_children = $(this).siblings( '.pl-tree-list' ).find( '.pl-tree-det' );
        open_children
            .find( '.pl-tree-arrow' )
            .trigger( 'click' );

        $(this).parent( '.pl-tree' ).removeClass('pl-tree-det');

	    $(this).siblings( '.pl-tree-node-info' )
	        .find( '.pl-tree-node-des' )
	        .css({ display: "block" });

	    $(this).siblings( '.pl-tree-end-det' )
	        .css({ display: 'none' });

	    // uncheck all endpoints in level
	    $(this).siblings( 'ul.pl-tree-list' )
	        .find( '.pl-tree-end-checked' )
	        .trigger( 'click' );

        if ( $(this)
                .closest( 'ul.pl-tree-list' )
    	        .parent()
    	        .is( '#pl-ch-datasets' ) ) {
    	    $(this).prev().hide();
    	}

	    $(this)
	        .unbind( 'click' )
	        .click( show_next_level );
    }


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


    function select_node() {
        var node_child = $(this).next( 'section.pl-tree' );
        var unmark_ends = node_child.find( '.pl-tree-end-unchecked' );
        unmark_ends.trigger( 'click' );
    }


    function unselect_node( node_checkbox ) {
        var node_child = node_checkbox.next( 'section.pl-tree' );
        var mark_ends = node_child.find( '.pl-tree-end-checked' );

        mark_ends.trigger( 'click' );
    }


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


    function uncheck_node( node_checkbox ) {
        node_checkbox
            .removeClass( 'pl-tree-node-checked' )
            .addClass( 'pl-tree-node-unchecked' )
            .unbind( 'click' )
            .click( select_node );
    }

    // return public interface
    return that;

})();
