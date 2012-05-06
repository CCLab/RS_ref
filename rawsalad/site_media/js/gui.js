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

var _gui = (function () {

// P U B L I C   I N T E R F A C E
    var that = {};
    // var select_children_of = _logger.log( select_children_of );
    // var show_children_of   = _logger.log( show_children_of );
    //var manage_top_panel = _logger.log( manage_top_panel );


    that.init_gui = function( permalink_start ) {
        // arm top menu buttons
        $('#top-menu li').click( function () {
            // register callbacks for all top-menu buttons
            var callbacks = {
                'tm-choose'   : show_browse,
                'tm-search'   : show_search,
                'tm-download' : show_download
            };
            var id = $(this).attr('id');

            manage_top_panel( $(this), callbacks[id] );
        });

        // show browse panel at the beginning
        if ( !permalink_start ) {
            $('#tm-choose').trigger('click');
        }
    };


    that.restore_session = function ( id, permalinks ) {
        var endpoints = permalinks.map( function ( e ) {
            return e['endpoint'];
        });
        // TODO where the init_callback has gone?
        var callbacks = callbacks_for( endpoints )['callbacks'];

        _resource.restore_permalink( id, endpoints, callbacks );
    };

    return that;


// P R I V A T E   I N T E R F A C E

    //  T O P   M E N U   C A L L B A C K S
    // TODO refactor these three callbacks
    // TODO specify the header of panels for each function
    function show_browse() {
        _resource.get_collections( function ( collections ) {
            // generate the dbtree html code
            var dbtree = _dbtree.get_dbtree( collections );
            $('#pl-ch-area').empty().append( _tmpl.datasets );
            $('#pl-ch-datasets')
                .empty()
                .append( dbtree )
                .append( M.to_html( _tmpl.panel_submit, {'label': 'Pokaż dane'} ));

            _dbtree.arm( collections );

            $('#pl-ch-submit').click( function () {
                var endpoints     = _dbtree.selected_endpoints();
                // if no endpoints selected - do nothing
                if( !endpoints.length ) {
                    return;
                }
                var cbacks        = callbacks_for( endpoints );
                var init_callback = cbacks['init_callback'];
                var callbacks     = cbacks['callbacks'];

                _resource.get_top_levels( endpoints, init_callback, callbacks );
            });
        });
    }

    function show_search() {

        _resource.get_collections( function ( collections ) {
            // for fixed floating
            var query_panel;
            var org_offset;
            // generate dbtree html code
            var dbtree = _dbtree.get_dbtree( collections );
            $('#pl-ch-area')
                .empty()
                .append( _tmpl.search_input )
                .append( _tmpl.datasets );

            $('#query-container')
                .append( M.to_html( _tmpl.panel_submit, {'label': 'Szukaj'} ));

            $('#pl-ch-datasets')
                .empty()
                .append( dbtree )

            _dbtree.arm( collections );

            $('#pl-ch-submit').click( function () {
                var query = $('#search-query').val().replace( /^\s*|\s$/g,'' );
                if( query.length < 3 || /^\d*$/.test( query ) ) {
                    return;
                }
                $('html,body').animate({ 'scrollTop': 0 }, 500 );

                show_search_propositions( _dbtree.selected_endpoints() );
            });

            $( $('.pl-tree-node')[0] ).trigger('click');

            $('#search-query')
                .keypress( function( event ) {
                    if ( event.which == 13 ) {
                        $('#pl-ch-submit').trigger( $.Event( 'click' ) );
                    }
                });

            query_panel = $('#pl-ch-area > section');
            $(window).scroll( function () {
                var scroll_position = $(window).scrollTop();
                org_offset = org_offset || query_panel.offset().top;

                console.log( scroll_position + " :: " + org_offset );
                if( scroll_position >= org_offset ) {
                    query_panel.addClass('fixed');
                }
                else {
                    query_panel.removeClass('fixed');
                }
            });
        });
    }

    function show_download() {
        _resource.get_collections( function ( collections ) {
            // generate dbtree html code
            var dbtree = _dbtree.get_dbtree( collections );
            var open_sheets = { 'groups': _resource.get_grouped_sheets() };

            $('#pl-ch-area')
                .empty()
                .append( _tmpl.datasets );

            $('#pl-ch-datasets')
                .empty()
                .append( dbtree )
                .append( M.to_html( _tmpl.panel_submit, {'label': 'Pobież dane'} ));

            _dbtree.arm( collections );

            if( !!open_sheets['groups'].length ) {
                $('#pl-ch-area')
                    .prepend( M.to_html( _tmpl.panel_sheets, open_sheets ) );
            }

            $('#pl-ch-submit').click( function () {
                var sheets = $('#dl-sheets').find('input:checked').map( function ( e ) {
                                 return $(this).attr('id');
                             });
                var checked_endpoints = _dbtree.selected_endpoints();
                var checked_sheets    = $.makeArray( sheets );

                _resource.download_data( checked_sheets, checked_endpoints );
            });
        });
    }

    // P A N E L   B U T T O N S   C A L L B A C K S
    function callbacks_for( endpoints ) {
        var init_callback = function () {
            console.log( "Wczytuję dane" );
        };
        var callbacks = [];
        callbacks = endpoints.map( function ( e ) {
            return function () {
                _resource.get_sheets_labels( draw_tabs );
            };
        });
        callbacks[0] = function ( data ) {
            draw_endpoint( data['data'] );
        };

        return {
            'init_callback' : init_callback,
            'callbacks'     : callbacks
        };
    }

    function show_search_propositions( endpoints ) {
        var query = $('#search-query').val();

        if ( endpoints.length === 0 ) {
            endpoints = _dbtree.get_all_endpoints();
        }

        // TODO refactor this not to use html
        _resource.get_search_count( endpoints, query, function ( data ) {
            var propositions = M.to_html( _tmpl.search_propositions, data );
            $('#pl-ch-datasets').empty().append( propositions );

            $('#pl-sr-results').find('p[data-endpoint]').each( function () {
                var endpoint = $(this).attr('data-endpoint');
                if( $(this).prev().html() === '0' ) {
                    return;
                }
                $(this)
                    .addClass('handy')
                    .click( function () {
                        show_search_results( endpoint, data['query'] );
                    });
            });
        });
    }

    function show_search_results( endpoint, query ) {
        _resource.get_search_data( endpoint, query, function ( data ) {
            draw_endpoint( data );
        });
    }




    function manage_top_panel( clicked, callback ) {
        // hide active panel
        if( clicked.hasClass('active') ) {
            // deactivate clicked button
            clicked.removeClass('active');
            clicked.animate({
                'padding-top': '5px',
                'padding-bottom': '5px'
            }, 100);

            // hide panel
            $('#panels').slideUp( 300, function () {
                if( !!callback ) callback();
            });
            $('#application').animate({ 'opacity': '1.0' }, 300 );
            $('#cover').remove();
        }
        else {
            // some other panel is currently open
            if( $('#panels').is(':visible') ) {
                // deactivate active button
                $('#top-menu').find('.active').animate({
                        'padding-top': '5px',
                        'padding-bottom': '5px'
                    }, 100, function () {
                        $(this).removeClass('active');
                    });

                // activate clicked button
                clicked.addClass('active');
                clicked.animate({
                    'padding-top': '8px',
                    'padding-bottom': '8px'
                }, 100);

                // hide current panel and show the new one
                $('#panels').slideUp( 300, function () {
                    callback();
                    $('#panels').slideDown( 300 );
                    $('#application').animate({ 'opacity': '0.3' }, 300 );
                    if( !$('#cover').length ) {
                        $('#application').append( _tmpl.cover );
                    }
                });
            }
            // no panel is currently open
            else {
                // activate button
                clicked.addClass('active');
                clicked.animate({
                    'padding-top': '8px',
                    'padding-bottom': '8px'
                }, 100);

                // draw and show the panel
                callback();
                $('#panels').slideDown( 300 );
                $('#application').animate({ 'opacity': '0.3' }, 300 );
                if( !$('#cover').length ) {
                    $('#application').append( _tmpl.cover );
                }
            }
        }
    }

    /////////////////////////////////
    // D R A W   F U N C T I O N S //
    /////////////////////////////////


    function draw_endpoint( data ) {

        draw_tools( data );
        draw_table( data );
        _resource.get_sheets_labels( draw_tabs );

        // deactivate menu button and hide the panel
        manage_top_panel( $('#top-menu').find('.active'), function () {
            $('#application').fadeIn( 300, function () {
                if ( data['type'] !== 2 ) { 
                    make_zebra();
                }
                // arm application ui
                $('#app-tbs-share').click( function () {
                    if( change_application_tab( $(this) ) ) {
                        update_share_tab(); // TODO
                        $('#app-share').show();
                    }
                });
                $('#app-tbs-table').click( display_table_panel );
            });
        });
    }

    function draw_permalink_endpoint( data ) {
        draw_tools( data );
        draw_table( data );
        _resource.get_sheets_labels( draw_tabs );
    }


    function draw_sheet( sheet_id ){
        var sheet_data = _resource.get_sheet_data( sheet_id );
        draw_table( _resource.get_sheet_data( sheet_id ) );
        draw_tools( _resource.get_sheet_name( sheet_id ), sheet_data['type'] );
        draw_tabs ( _resource.get_sheets_labels() );
    }


    function draw_tabs( data ) {
        adjust_tabs_length( data );
        display_tabs( M.to_html( _tmpl.app_table_header, data ));
    }


    function draw_tools( names, sheet_type ) {
        if ( sheet_type !== 0 && !sheet_type ) {
            sheet_type = names['type'];
        }
        if ( !!names['old_label'] ) {
            names['changed_label'] = !( names['label'] === names['old_label'] );
        }
        if ( sheet_type === _enum['FILTERED'] || sheet_type === _enum['SEARCHED'] ) {
            names['non_standard_result'] = true;
        }

        display_tools( M.to_html( _tmpl.app_table_tools, names ) );
    }


    function draw_table( data ) {
        _table.create_table( data, display_table );
    }



    ///////////////////////////////////////
    // D I S P L A Y   F U N C T I O N S //
    ///////////////////////////////////////


    // APPLICATION TABS

    function display_share_panel() {

    }


    function display_table_panel() {

        if( change_application_tab( $(this) ) ) {
            $('#app-table').show();
        }
    }


    // APPLICATION TABLE

    // active table should be loaded
    function display_tabs( tabs ) {
        var tabs_code = $(tabs);

        set_active_tab( tabs_code );
        preapare_tabs_interface( tabs_code );

        $('#app-table>header').empty();
        $('#app-table>header').append( tabs_code );
    }


    function display_tools( tools ) {
        var tools_code = $(tools);
        prepare_tools_interface( tools_code );
        $('#app-tb-tools').empty();
        $('#app-tb-tools').append( tools_code );
    }


    function display_table( table ) {
        var table_code = $(table);
        $('#app-tb-datatable').empty();
        $('#app-tb-datatable').append( table_code );
        arm_rows( $('tbody > tr') );
        make_zebra();
    }



    /////////////////////////////////////////////////////////////
    // P R E A P A R E   I N T E R F A C E   F U N C T I O N S //
    /////////////////////////////////////////////////////////////


    // TABLE TABS INTERFACE

    function preapare_tabs_interface( tabs_code ) {

        var copy_bt  = tabs_code.closest('#app-tb-save-sheet');
        var tabs     = tabs_code.find( 'li' );
        var close_bt = tabs_code.find( '.close-sheet-button' );

        // EVENTS
        tabs
            .click( change_sheet );

        close_bt
            .click( close_sheet );

        copy_bt
            .click( copy_sheet );
    }


    // TABLE TOOLS INTERFACE

    function prepare_tools_interface( tools_code ) {
        var rename_bt  = tools_code.find('#app-tb-tl-rename-button');
        var clear_bt   = tools_code.find('#app-tb-tl-clear-button');
        var sort_bt    = tools_code.find('#app-tb-tl-sort-button');
        var filter_bt  = tools_code.find('#app-tb-tl-filter-button');
        var columns_bt = tools_code.find('#app-tb-tl-columns-button');

        // EVENTS
        rename_bt
            .click( show_rename_form );

        clear_bt
            .click( clear_table );

        sort_bt
            .click( toggle_sort_panel );

        filter_bt
            .click( toggle_filter_panel );

        columns_bt
            .click( display_add_columns );

    }


    // TABLE ROWS INTERFACE



    /////////////////////////////////////////////
    // G U I   E V E N T S   F U N C T I O N S //
    /////////////////////////////////////////////


    // APPLICATION TABS EVENTS

    function change_application_tab( button ){

        if ( button.hasClass( 'active' ) ) {
            return false;
        }

        button.siblings().removeClass( 'active' );
        button.addClass( 'active' );
        $('.app-container:visible').hide();

        return true;
    }


    // TABLE TABS EVENTS

    function change_sheet() {
        var sheet_id;
        var button = $(this);

        if ( button.hasClass( 'active' ) ) {
            return;
        }
        sheet_id = get_sheet_id( button );
        draw_sheet( sheet_id );
    }


    function close_sheet() {
        var sheet_id = active_sheet_id();
        var new_sheet_id = after_close_id();

        var callback = function () {
            draw_sheet( new_sheet_id );
        }
        _resource.close_sheet( sheet_id, callback );
    }


    function copy_sheet() {
        var sheet_id = active_sheet_id();

        var callback = function( data ) {
            // TODO give me just an id _resource
            draw_sheet( data['sheet_id'] );
        }
        _resource.copy_sheet( sheet_id, callback );
    }


    // TOOLS EVENTS

    function show_rename_form() {
        var label;
        var tmp_label;
        var old_label;

        var sheet_id = active_sheet_id();

        if( $('#app-tb-tl-rename-input').is(":visible") ) {
            label = $('#app-tb-tl-rename-input').val().replace( /^\s*|\s$/g,'' );
            old_label = active_sheet_name();

            if( ( label !== old_label ) && /\S/.test( label ) ) {
                _resource.change_name( sheet_id, label );
                draw_tabs ( _resource.get_sheets_labels() );
                draw_tools( _resource.get_sheet_name( sheet_id ) );
            }
            $('#app-tb-tl-rename-form').hide();
            $('#app-tb-tl-title').show();
        }
        else {
            tmp_label = $('#app-tb-tl-title').html();
            old_label = active_sheet_name();

            $('#app-tb-tl-title').hide();
            $('#app-tb-tl-rename-form')
                .show()
                .submit( function () {
                    $('#app-tb-tl-rename-button').trigger('click');
                    return false;
                });

            $('#app-tb-tl-rename-input')
                .val( old_label )
                .select()
                .focus()
                .keyup( function( event ) {
                    if( event.keyCode === 27 ) {
                        $('#app-tb-tl-title')
                            .show();
                        $('#app-tb-tl-rename-form')
                            .unbind('submit')
                            .hide();
                    }
                });
        }
    }

    function clear_table() {
        var sheet_id = active_sheet_id();
        _resource.clean_table( sheet_id, function() {
            var forms = $('#app-tb-tools').find('form:visible');
            if ( forms.length !== 0 ) {
                forms.slideUp( 200, function () {
                    draw_sheet( sheet_id );
                });
            } else {
                draw_sheet( sheet_id );
            }
        });
    }


    // Shows/hides sort panel with event handlers defined and the first sort key.
    function toggle_sort_panel( event ) {
        var sort_form_code = $( _tmpl.sort_form );
        var other_forms = $('#app-tb-tools').find('form:visible');
        var forms_parent = $('#app-tb-tl-srft-forms');

        if ( $('#app-tb-tl-sort-form').length === 0 ) {
            prepare_sort_interface( sort_form_code );
            add_sort_key( sort_form_code );
            
            if ( other_forms.length === 0 ) {
                forms_parent.append( sort_form_code );
                $('#app-tb-tl-sort-form').slideDown( 200 );
            } else {
                other_forms.slideUp( 200, function () {
                    forms_parent.children().remove();
                    forms_parent.append( sort_form_code );
                    $('#app-tb-tl-sort-form').slideDown( 200 );
                });
            }
        } else {
            $('#app-tb-tl-sort-form').slideUp( 200, function() {
                forms_parent.empty();
            });
        }
    }

    // Shows/hides filter panel with event handlers defined and the first filter key.
    function toggle_filter_panel( event ) {
        var filter_form_code = $( _tmpl.filter_form );
        var other_forms = $('#app-tb-tools').find('form:visible');
        var forms_parent = $('#app-tb-tl-srft-forms');

        if ( $('#app-tb-tl-filter-form').length === 0 ) {
            prepare_filter_interface( filter_form_code );
            add_filter_key( filter_form_code );
            
            if ( other_forms.length === 0 ) {
                forms_parent.append( filter_form_code );
                $('#app-tb-tl-filter-form').slideDown( 200 );
            } else {
                other_forms.slideUp( 200, function () {
                    forms_parent.children().remove();
                    forms_parent.append( filter_form_code );
                    $('#app-tb-tl-filter-form').slideDown( 200 );
                });
            }
        } else {
            $('#app-tb-tl-filter-form').slideUp( 200, function() {
                forms_parent.empty();
            });
        }
    }

    function display_add_columns( event ) {
        var sheet_id = active_sheet_id();

        var callback = function( columns ){
            var columns_object =  { 'columns': columns };
            var columns_form = M.to_html( _tmpl.columns_form, columns_object );

            $('#app-tb-tools')
                .find('form:visible')
                .slideUp( 200, function () {
                    $('#app-tb-tl-srft-forms').empty();
                });

            $('#app-tb-tl-columns-list').append( $(columns_form) );
            $('#app-tb-tl-columns-form').slideDown( 200 );
            $('html')
                .click( function () {
                    $('#app-tb-tl-columns-button')
                        .trigger( $.Event( 'click' ));
                });

            event.stopPropagation();
            prepare_columns_form_interface();
        };

        $(this)
            .unbind( 'click' )
            .click( hide_add_columns );

        _resource.all_columns( sheet_id, callback );
    }


    function hide_add_columns( event ) {
        $('#app-tb-tl-columns-form').slideUp( 200, function() {
            $('#app-tb-tl-columns-list').empty();
        } );

        $('html').unbind( 'click' );

        event.stopPropagation();

        $(this)
            .unbind( 'click' )
            .click( display_add_columns );
    }


    function sort_table( sheet_id, settings ) {
        _resource.sort( sheet_id, settings, draw_table );
    }


    function filter_table( sheet_id, settings ) {
        _resource.filter( sheet_id, settings, function ( data ) {
            draw_sheet( data['id'] );
        });
    }


    function arm_rows( rows ) {
        if ( $('#show-breadcrumb-0').length === 0 ) {
            arm_standard_rows( rows );
        } else {
            arm_boxes( rows );
        }
    }

    function arm_standard_rows( rows ) {
        rows.find('.click').parent().click( function () {
            var clicked = $(this);
            // check state of the clicked node and it's	neighborhood
            var is_top      = clicked.attr('data-parent') === '';
            var is_open     = clicked.attr('data-open') === 'true';
            var is_selected = clicked.hasClass('selected') ||
                              clicked.hasClass('in-selected');

            if( is_open ) {
                if( is_selected ) {
                    hide_children_of( clicked );
                }
            }
            else {
                if( is_selected || is_top ) {
                    show_children_of( clicked );
                }
            }
        });

        // arm for selection functionality
        // TODO debug it
        rows.click( function () {
            var clicked = $(this);
            var is_top      = clicked.attr('data-parent') === '';
            var is_selected = clicked.hasClass('selected') ||
                              clicked.hasClass('in-selected');

            if( !is_selected ) {
                select_children_of( clicked );
            }
            if( is_selected && is_top ) {
                // clean previous selection
                $('tr').removeClass('selected')
                       .removeClass('in-selected')
                       .removeClass('after-selected')
                       .removeClass('dim');

                _resource.unselect_all( active_sheet_id() );
            }
        });

    }

    function arm_boxes( rows ) {
        rows.each( function() {
            var this_row = $(this);
            var id = this_row.attr('box_id');
            this_row.find('#show-breadcrumb-' + id).click( function () {
                toggle_breadcrumb( id );
            });
            this_row.find('#show-context-' + id).click( function () {
                toggle_context( id );
            });
        });
    }


    // TABLE EVENTS
    function show_children_of( clicked_row ) {
        var clicked_id = get_id( clicked_row );
        var callback   = function ( data ) {
            var new_rows = $( _table.generate_node( data ) );
            clicked_row.attr( 'data-open', 'true' )
                       .after( new_rows );

            arm_rows( new_rows );
            make_zebra();
        }

        _resource.get_children( active_sheet_id(), clicked_id, callback )
    }


    function hide_children_of( clicked_row ) {
        var close_node = function ( node ) {
            var node_id  = get_id( node );
            var children = node.siblings('[data-parent="' + node_id +'"]');

            if( !children.length ) {
                return;
            }

            children.each( function () {
                close_node( $(this) );
            });

            children.remove();
            make_zebra();
        };

        // clean html
        close_node( clicked_row );
        // remove children from resources
        _resource.remove_children( active_sheet_id(), get_id( clicked_row ) );

        // TODO debug it
        if( clicked_row.hasClass('.top') ) {
            $('tr').removeClass('dim');
            clicked_row.removeClass('selected');
        }

        clicked_row.attr( 'data-open', 'false' );
    }

    function select_children_of( clicked_row ) {
        var top_parent_of = function ( node ) {
            var parent_id = node.attr('data-parent');

            if( parent_id === '' ) {
                return node;
            }

            return top_parent_of( $('#'+parent_id) );
        };
        var next_top_node = function ( node ) {
            var next_node = node.next();
            var next_top = node.next('tr.top');

            // if last row in the table - return
            if( !next_node.length ) {
                return;
            }
            // if next one is top-level - return it
            if( !!next_top.length ) {
                return next_top;
            }

            return next_top_node( node.next() );
        };
        var top_parent    = top_parent_of( clicked_row );
        var next_top      = next_top_node( top_parent );
        var prev_selected = get_id( $('tr.selected') );

        // if no previous selection - prev_selected is undefined
        _resource.row_selected( active_sheet_id(), get_id( top_parent ), prev_selected );

        // clean previous selection
        $('tr').removeClass('selected')
               .removeClass('in-selected')
               .removeClass('after-selected')
               .addClass('dim');

        // start selecting nodes
        top_parent.addClass('selected')
                  .nextUntil('.top', 'tr')
                  .removeClass('dim')
                  .addClass('in-selected');

        // TODO debug it
        if( !!next_top ) {
            next_top.addClass('after-selected');
        }
    }

    function show_breadcrumb_context_pressed() {
        var id = $(this).attr('id');
        var id_parts = id.split('-');
        if ( id_parts[ 1 ] === 'breadcrumb' ) {
            toggle_breadcrumb( parseInt( id_parts[ 2 ] ) );
        } else {
            toggle_context( parseInt( id_parts[ 2 ] ) );
        }

    }


    function refresh_box( box_id, data ) {
        var box_code = $( _table.generate_search_box( data, box_id ) );
        var box = $('[box_id = ' + box_id + ']');

        box.remove();

        if ( box_id > 0 ) {
            $('[box_id = ' + (box_id-1) + ']').last().after( box_code );
        } else {
            $('#app-tb-datatable > tbody').prepend( box_code );
        }

        $('#show-breadcrumb-' + box_id).click( show_breadcrumb_context_pressed );
        $('#show-context-' + box_id).click( show_breadcrumb_context_pressed );
    }

    function toggle_context( box_id ) {
        var sheet_id = active_sheet_id();

        _resource.toggle_context( sheet_id, box_id, function ( data ) {
            refresh_box( box_id, data );
        });
    }

    function toggle_breadcrumb( box_id ) {
        var sheet_id = active_sheet_id();

        _resource.toggle_breadcrumb( sheet_id, box_id, function ( data ) {
            refresh_box( box_id, data );
        });
    }




    // PERMALINK EVNTS

    // not used yet:




    ///////////////////////////////////////
    // S U P P O R T   F U N C T I O N S //
    ///////////////////////////////////////

    // SHARE TABLE FUNCTIONS

    function update_share_tab() { //TODO
        var open_sheets = { 'groups': _resource.get_grouped_sheets() };
        $('#app-sh-panel').empty().append( M.to_html( _tmpl.panel_sheets, open_sheets ) );

        $('#app-sh-permalink').hide();
        $('#app-sh-submit')
            .show()
            .unbind( 'click' )
            .click( function () {
            var checked = $('#app-sh-panel')
                                .find('input:checked')
                                .map( function () {
                                    return $(this).attr('id');
                                });

            // no sheet selected
            if( !checked.length ) {
                return;
            }

            _resource.create_permalink( $.makeArray( checked ), function ( permalink_id ) {
                console.log(10);
                $('#app-sh-submit').hide();
                $('#app-sh-permalink').slideDown( 150 )
                                      .find('input')
                                      .val( 'http://localhost:8000/' + permalink_id )
                                      .focus()
                                      .select();
            });
        });
    }


    // TABLE TABS FUNCTIONS

    function new_active_tab( button ) {
        var close_bt = $(_tmpl.close_sheet_button);
        var siblings = button.siblings();

        siblings.removeClass( 'active' );
        siblings.find( '.close-sheet-button' ).remove();

        button.addClass('active');
        if ( siblings.length > 0 ) {
            button.append( close_bt );
        }
    }


    function adjust_tabs_length( data ) {
        var sheets = data['sheets'];
        var max_length = tab_max_length( sheets.length );

        data['sheets'] = sheets.map( function( sheet ) {
            var name = sheet['name'];

            if ( name.length > max_length ) {
                sheet['name'] = name.slice( 0, max_length - 3 ) + '...';
            }
            return sheet;
        } );
    }


    function tab_max_length( tabs_num ) {
        var cut = [20, 20, 20, 20, 15, // 1-5
                   15, 15, 12, 12, 12, // 6-10
                   9, 9, 6, 6, 6,      // 11-15
                   6, 4, 4, 4, 4,      // 16-20
                   4, 4                // 21-22
                  ];

        if ( tabs_num  > cut.length ){
            return 3;
        }

        return cut[ tabs_num-1 ];
    }


    function set_active_tab( tabs_code ) {
        var table_header = $('#app-tb-datatable>thead');
        var active_sheet_id = table_header.attr( 'data-sheet-id' );
        var active_tab_bt = tabs_code.find( '#snap-' + active_sheet_id );

        new_active_tab( active_tab_bt );
    }


    function after_close_id() {
        var new_sheet_id;
        var active_tab = $('#app-tb-sheets').find( '.active' );
        var active_group = active_tab.attr( 'data-group' );
        var all_tabs = active_tab.siblings();

        var group_sheets = all_tabs.filter( function () {
            return ( $(this).attr( 'data-group' ) === active_group );
        } );

        if ( group_sheets.length > 0 ) {
            new_sheet_id = parse_id_num( group_sheets[0]['id'] );
        }
        else {
            new_sheet_id = parse_id_num( all_tabs[0]['id'] );
        }

        return  new_sheet_id;
    }


    function active_sheet_id() {
        var sheet_tab = $('#app-tb-sheets').find( '.active' );
        var tab_id = sheet_tab.attr( 'id' );
        var sheet_id = parse_id_num( tab_id );

        return  parseInt( sheet_id, 10 );
    }


    function get_sheet_id( tab ) {
        var tab_id = tab.attr( 'id' );
        var sheet_id = parse_id_num( tab_id );
        return  parseInt( sheet_id, 10 );
    }


    function parse_id_num( tab_id ) {
        var sheet_id = tab_id.split( '-' )[1];
        return  parseInt( sheet_id, 10 );
    }


    // TOOLS FUNCTIONS


    function active_sheet_name() {
        var tab = $('#app-tb-tl-title');
        return tab.text();
    }

    // add columns functions
    function prepare_columns_form_interface() {

        $('#app-tb-tl-lt-select')
            .click( function () {
                $('input[name=app-tb-tl-columns]').attr( 'checked', 'true' );
            });

        $('#app-tb-tl-lt-unselect')
            .click( function () {
                $('input[name=app-tb-tl-columns]').removeAttr( 'checked' );
            });

        $('#app-tb-tl-lt-submit')
            .click( function () {
                $('#app-tb-tl-columns-form').submit();
            });

        $('#app-tb-tl-columns-form')
            .click( function ( event ) {
                event.stopPropagation();
            })
            .submit( function () {
                var columns = [];
                var sheet_id = active_sheet_id();
                var checkboxes = $( 'input[name=app-tb-tl-columns]:checked' );
                var callback = function( data ){
                        draw_table( data );
                        $('#app-tb-tl-columns-button').trigger( 'click' );
                };

                checkboxes.map( function ( index, input ) {
                    columns.push( input['value'] );
                });

                _resource.show_with_columns( sheet_id, columns, callback )

                // to prevent form's action!!
                return false;
            });
    }


    // Define event handlers for Add sort key button and sort button.
    function prepare_sort_interface( sort_form ){
        var add_key_button = get_sort_add_button( sort_form );
        var del_key_button = get_sort_del_button( sort_form );
        var submit_button = sort_form.find('#app-tb-tl-sort-submit');

        add_key_button.click( function () {
            add_sort_key();
        });

        del_key_button.click( function () {
            del_sort_key();
        });

        submit_button.click( function () {
            sort_form.submit();
        });

        sort_form.submit( function () {
            var sheet_id = active_sheet_id();
            var settings = get_sort_settings();

            $(this).remove();
            sort_table( sheet_id, settings );

            return false;
        });
    }

    function get_sort_settings() {
        var column, order;
        var settings = [];
        var i;
        var keys_num = $('#app-tb-tl-sort-form').find('tbody > tr').length;

        for( i = 0; i < keys_num; i += 1 ) {
            column = $( '.column-key-'+ i +':selected' ).val();
            // if column not selected by user
            if( column === "null" ) {
                // if it's a first key - quit
                if( i === 1 ) {
                    $(this).hide();
                    return false;
                }
                // process the previous keys
                else {
                    break;
                }
            }
            order = $('.order-key-'+ i +':selected').val();
            // if order not set, set it to ascending
            if( !order ) {
                order = 'gt';
            }
            settings.push(
                {
                    "key"       : column,
                    "preference": order
                }
            );
        }

        return settings;
    }

    function get_sort_add_button( sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        return sort_form.find('#app-tb-tl-sort-add');
    }

    function get_sort_del_button( sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        return sort_form.find('#app-tb-tl-sort-del');
    }

    function get_sort_keys( sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        return sort_form.find('tbody').children();
    }

    function get_sort_key( i, sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        return sort_form.find('#sort-key-' + i);
    }

    function get_sort_key_name( i, sort_form ) {
        return get_sort_key( i, sort_form )
                   .find('[name=app-tb-tl-sort-form-columns]');
    }

    function get_sort_key_order( i, sort_form ) {
        return get_sort_key( i, sort_form )
                   .find('[name=app-tb-tl-sort-order]');
    }

    function handle_sort_key_name_change( key, i ) {
        var new_column = key.val();
        var prev_column = key.attr('prev_name');

        key.attr( 'prev_name', new_column );
        remove_from_sort_keys( new_column, i );
        remove_null_sort_key( i );
        add_to_sort_keys( prev_column );

        if ( get_sort_key_order( i ).val() !== 'null' ) {
            get_sort_add_button().click( function () {
                add_sort_key();
            });
        }
    }

    function handle_sort_order_change( key, i ) {
        remove_null_sort_ord( i );
        if ( get_sort_key_name( i ).val() !== 'null' ) {
            get_sort_add_button().click( function () {
                add_sort_key();
            });
        }
    }

    function add_sort_key( sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        var sheet_id = active_sheet_id();

        _resource.get_sortable_columns( sheet_id, function ( data ) {
            var placeholder = sort_form.find( 'tbody' );
            var keys = get_sort_keys( sort_form );
            var add_key_button = get_sort_add_button( sort_form ); 
            var del_key_button = get_sort_del_button( sort_form );
            var key_html;
            var new_key_name_field;
            var new_order_field;

            data['keys_num'] = keys.length;

            hide_redundant_keys( sort_form, data );
            key_html = M.to_html( _tmpl.sort_key, data, data['keys_num'] );
            placeholder.append( key_html );

            if ( data['columns'].length === data['keys_num'] + 1 ||
                _enum['MAX_KEYS'] === data['keys_num'] + 1 ){
                add_key_button.hide();
            }
            if ( data['keys_num'] == 1 ) {
                del_key_button.show();
            }

            add_key_button.unbind('click');
            new_key_name_field = get_sort_key_name( data['keys_num'], sort_form );
            new_order_field = get_sort_key_order( data['keys_num'], sort_form );
            new_key_name_field.change( function () {
                handle_sort_key_name_change( $(this), data['keys_num'] );
            });
            new_order_field.change( function () {
                handle_sort_order_change( $(this), data['keys_num'] );
            });
        });
    }

    function remove_null_sort_key( i, sort_form ) {
        get_sort_key_name( i, sort_form )
            .find('[value=null]')
            .hide();
    }

    function remove_null_sort_ord( i, sort_form ) {
        get_sort_key_name( i, sort_form )
            .find('[value=null]')
            .hide();
    }

    function remove_from_sort_keys( col_key, good_key, sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        var keys = sort_form.find( 'tbody' ).children();

        keys.each( function ( i ) {
            if ( i !== good_key ) {
                get_sort_key_name( i, sort_form )
                    .find('[value=' + col_key + ']')
                    .hide()
            }
        });
    }

    function add_to_sort_keys( col_key, sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        var keys = sort_form.find( 'tbody' ).children();

        keys.each( function ( i ) {
            get_sort_key_name( i, sort_form )
                .find('[value=' + col_key + ']')
                .show()
        });
    }

    function del_sort_key( sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        var keys = get_sort_keys( sort_form );
        var del_key_button = get_sort_del_button( sort_form );
        var add_key_button = get_sort_add_button( sort_form ); 
        var last_key = get_sort_key( keys.length - 1, sort_form );
        var new_key_name_field = get_sort_key_name( keys.length - 1, sort_form );
        var prev_column = new_key_name_field.val();

        add_to_sort_keys( prev_column );
        last_key.remove();

        if ( add_key_button.is(':hidden') ) {
            add_key_button.show();
        }
        // Maybe add key button has click bound, maybe not, we dont know
        add_key_button
            .unbind('click')
            .click( function () {
                add_sort_key();
            });
        if ( keys.length == 2 ) {
            del_key_button.hide();
        }
    }

    function hide_redundant_keys( sort_form, data ) {
        var selected_columns = {};
        var column;
        var i;

        for ( i = 0; i < data['keys_num']; i += 1 ) {
            column = sort_form.find('.column-key-'+ i +':selected').val();
            selected_columns[ column ] = true;
        }

        data['columns'] = data['columns'].map( function ( col ) {
            col['hidden'] = !!selected_columns[ col['key'] ];
            return col;
        });
    }

    function prepare_filter_interface( filter_form ){
        var add_key_button = get_filter_add_button( filter_form );
        var del_key_button = get_filter_del_button( filter_form );
        var submit_button = get_filter_submit_button( filter_form );

        add_key_button.click( function () {
            add_filter_key();
        });

        del_key_button.click( function () {
            del_filter_key();
        });

        submit_button.click( function () {
            filter_form.submit();
        });

        filter_form.submit( function () {
            var sheet_id = active_sheet_id();
            var settings = get_filter_settings();

            $(this).remove();
            if ( !!settings ) {
                filter_table( sheet_id, settings );
            }

            return false;
        });
    }

    function get_filter_settings() {
        var column, operation, query;
        var i;
        var keys_num = $('#app-tb-tl-filter-form').find('tbody > tr').length;
        var settings = [];
        var tmp, type;

        for ( i = 0; i < keys_num; ++i ) {
            column = $('.filter-column-'+ i +':selected').val();
            if ( column === "null" ) {
                if ( i === 1 ) {
                    return undefined;
                } else {
                    break;
                }
            }
            operation = $('.filter-operation-'+i+':selected').val();
            query = $('#filter-'+i+'-query').val();
            type = $('#filter-' + i + '-operations').attr('name');


            if ( type === 'number-operation' ) {
                query = parseInt( query, 10 );
                if ( isNaN( query ) ) {
                    return undefined;
                }
            }

            settings.push({
                'key'        : column,
                'value'      : query,
                'preference' : operation
            });
        }

        return settings;
    }

    function get_filter_add_button( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        return filter_form.find('#app-tb-tl-filter-add');
    }

    function get_filter_del_button( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        return filter_form.find('#app-tb-tl-filter-del');
    }

    function get_filter_submit_button( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        return filter_form.find('#app-tb-tl-filter-submit');
    }

    function get_filter_keys( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        return filter_form.find('tbody').children();
    }

    function get_filter_key( i, filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        return filter_form.find('#filter-key-' + i);
    }

    function get_filter_key_name( i, filter_form ) {
        return get_filter_key( i, filter_form )
                   .find('#filter-' + i + '-columns');
    }

    function get_filter_op( i, filter_form ) {
        return get_filter_key( i, filter_form )
                   .find('#filter-' + i + '-operations');
    }

    function get_filter_query( i, filter_form ) {
        return get_filter_key( i, filter_form )
                   .find('#filter-' + i + '-query');
    }

    function activate_filter( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        var submit_button = get_filter_submit_button( filter_form );

        submit_button.click( function () {
            filter_form.submit();
        });
    }

    function deactivate_filter( filter_form ) {
        var submit_button = get_filter_submit_button( filter_form );

        submit_button.unbind('click');
    }

    function all_filter_keys_filled( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        var keys_num = get_filter_keys( filter_form ).length;
        var i;

        for ( i = 0; i < keys_num; ++i ) {
            if ( get_filter_query( i, filter_form ).val() === '' ) {
                return false;
            }
        }
        return true;
    }

    function handle_filter_key_name_change( key, i, columns ) {
        var selected_column = key.val();
        var operations_html = get_operations( columns, selected_column, i );
        var operations_placeholder = get_filter_op( i ).parent();

        get_filter_op( i ).remove();
        operations_placeholder.append( $(operations_html) );
        get_filter_query( i ).val('');

        remove_null_filter_key( i );

        get_filter_op( i ).change( function () {
            handle_filter_op_change( $(this), i );
        });

        deactivate_filter();
    }


    function handle_filter_op_change( key, i ) {
        remove_null_filter_op( i );
        get_filter_query( i ).removeAttr('disabled');
    }

    function handle_filter_query_change( key, i ) {
        var add_key_button = get_filter_add_button();

        add_key_button.unbind('click');
        if ( key.val() !== '' ) {
            add_key_button.click( function () {
                add_filter_key();
            });
            if ( all_filter_keys_filled() ) {
                activate_filter();
            }
        } else {
            deactivate_filter();
        }
    }

    function add_filter_key( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        var sheet_id = active_sheet_id();

        _resource.get_filterable_columns( sheet_id, function ( data ) {
            var placeholder = filter_form.find( 'tbody' );
            var keys = get_filter_keys( filter_form );
            var add_key_button = get_filter_add_button( filter_form );
            var del_key_button = get_filter_del_button( filter_form );
            var key_html;
            var keys_num = keys.length;
            var new_key_name_field;
            var new_query_field;

            data['keys_num'] = keys_num;

            key_html = M.to_html( _tmpl.filter_key, data );
            placeholder.append( key_html );

            if ( _enum['MAX_KEYS'] === keys_num + 1 ) {
                add_key_button.hide();
            }
            if ( keys_num == 1 ) {
                del_key_button.show();
            }

            add_key_button.unbind('click');
            deactivate_filter( filter_form );

            new_key_name_field = get_filter_key_name( keys_num, filter_form );
            new_query_field = get_filter_query( keys_num, filter_form );

            new_key_name_field.change( function () {
                handle_filter_key_name_change( $(this), keys_num, data['columns'] );
            });

            new_query_field.change( function () {
                handle_filter_query_change( $(this), keys_num );
            });
        });
    }

    function del_filter_key( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        var keys = get_filter_keys( filter_form );
        var del_key_button = get_filter_del_button( filter_form );
        var add_key_button = get_filter_add_button( filter_form ); 
        var last_key = get_filter_key( keys.length - 1, filter_form );

        last_key.remove();

        if ( add_key_button.is(':hidden') ) {
            add_key_button.show();
        }
        // Maybe add key button has click bound, maybe not, we dont know
        add_key_button
            .unbind('click')
            .click( function () {
                add_filter_key();
            });
        if ( keys.length == 2 ) {
            del_key_button.hide();
        }

        if ( all_filter_keys_filled() ) {
            activate_filter();
        }
    }

    function remove_null_filter_key( i, filter_form ) {
        get_filter_key_name( i, filter_form )
            .find('[value=null]')
            .hide();
    }

    function remove_null_filter_op( i, filter_form ) {
        get_filter_op( i, filter_form )
            .find('[value=null]')
            .hide();
    }

    function get_operations( columns, selected_column, keys_num ) {
        var type;
        var column;
        var operations;
        var data = { 'keys_num': keys_num };

        column = columns.filter( function ( column ) {
            return column['key'] === selected_column;
        })[0];
        type = ( !!column ) ? column['type'] : 'null';

        switch ( type ) {
            case 'string':
                operations = M.to_html( _tmpl.string_operations, data );
                break;
            case 'number':
                operations = M.to_html( _tmpl.number_operations, data );
                break;
            case 'null':
                operations = M.to_html( _tmpl.null_operations, data );
                break;
            default:
                throw 'Add filter operation: unexpected type: ' + type;
        }

        return operations;
    }

    // TABLE FUNCTIONS
    // rows_code is jQuery object of rows added to page
    function add_selection( rows_code ) {
        var top_row    = get_prev_top_row( rows_code );
        var top_row_id = get_id( top_row );

        var old_selected = $('tr.selected');
        var old_selected_row_id;

        if ( old_selected.length === 1 ) {
            old_selected_row_id = get_id( old_selected );
        }

        if ( old_selected_row_id !== top_row_id ) {
            select( rows_code );
            _resource.row_selected( active_sheet_id(), top_row_id, old_selected_row_id );
        }
        else {
            rows_code.addClass( 'in-selected' );
        }
    }


    // row is 'tr' jQuery object or list of objects
    function select( row, isReselect ) {

        var top_row = get_prev_top_row( row );
        var in_select = top_row.nextUntil( '.top' );
        var after_row = get_next_top_row( row );
        var rows = top_row.prevAll()
                    .add( after_row.nextAll() );

        deselect();
        top_row.addClass( 'selected' );
        in_select.addClass( 'in-selected' );
        after_row.addClass( 'after-selected' );
        rows.addClass( 'dim' );

        // TODO change after changing click logic in the rows
        if ( !!isReselect ) {
            var clickable_children = in_select.find( 'td.click' ).parent();
            var open_children = clickable_children.filter( '[data-open="true"]' );
            var close_children = clickable_children.filter( '[data-open="false"]' );

            top_row
                .unbind( 'click' )
                .click( hide_children_of );
            after_row.unbind( 'click' );
            open_children.click( hide_children_of );
            close_children.click( show_children_of );
        }
    }


    function deselect() {
        $('tr.selected')
            .removeClass( 'selected' )
            .unbind( 'click')
            .click( reselect );
        $('tr.in-selected')
            .removeClass( 'in-selected' )
            .unbind( 'click' )
            .click( reselect );
        $('tr.after-selected').removeClass( 'after-selected' );
        $('tr.dim').removeClass( 'dim' );
    }

    function reselect() {
        var row = $(this);
        select( row, true );
    }


    //get root for rows
    function get_prev_top_row( rows_code ) {
        var row = rows_code.first();
        while ( ! row.hasClass( 'top' ) ) {
            row = row.prev();
        }
        return row;
    }


    // check for last row, if no - return empty jQuery object
    function get_next_top_row( rows_code ) {
        var row = rows_code.last().next();

        while ( ( row.length !== 0 ) && ! row.hasClass( 'top' ) ) {
            row = row.next();
        }
        return row;
    }


    // get and parse id num from jquery object
    function get_id( obj ) {
        var id = obj.attr( 'id' );
        return parseInt( id, 10 );
    }


    function make_zebra() {
        // TODO use even/odd CSS selectors
        $('#app-tb-datatable')
            .find('tr:visible')
            .each( function ( i ) {
                if( i % 2 === 0 ) {
                    $(this).removeClass( 'odd' );
                    $(this).addClass( 'even' );
                }
                else {
                    $(this).removeClass( 'even' );
                    $(this).addClass( 'odd' );
                }
            });
    }

})();
