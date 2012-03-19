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

    that.init_gui = function() {
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
        $('#tm-choose').trigger('click');
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
                show_search_propositions( _dbtree.selected_endpoints() );
            });

            $( $('.pl-tree-node')[0] ).trigger('click');

            $('#search-query')
                .keypress( function( event ) {
                    if ( event.which == 13 ) {
                        $('#pl-ch-submit').trigger( $.Event( 'click' ) );
                    }
                });
        });


        var query_panel = $('#pl-ch-area > section');
        var org_offset  = query_panel.offset().top;

        $(window).scroll( function () {
            var scroll_position = $(window).scrollTop();

            if( scroll_position > org_offset ) {
                org_offset = query_panel.offset().top;
                query_panel.addClass('fixed');
            }
            else {
                query_panel.removeClass('fixed');
                org_offset = query_panel.offset().top;
            }
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
                make_zebra();
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


    function draw_sheet( sheet_id ){
        draw_table( _resource.get_sheet_data( sheet_id ) );
        draw_tools( _resource.get_sheet_name( sheet_id ) );
        draw_tabs ( _resource.get_sheets_labels() );
    }


    function draw_tabs( data ) {
        adjust_tabs_length( data );
        display_tabs( M.to_html( _tmpl.app_table_header, data ));
    }


    function draw_tools( names ) {
        names['changed_label'] = !( names['label'] === names['old_label'] );
        if ( names['type'] === 2 ) {
            names['search_result'] = true;
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
        prepare_rows_interface( table_code );
        $('#app-tb-datatable').empty();
        $('#app-tb-datatable').append( table_code );
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
            .click( display_sort_panel );

        filter_bt
            .click( display_filter_panel );

        columns_bt
            .click( display_add_columns );

    }


    // TABLE ROWS INTERFACE

    // TODO redesign it from scratch
    function prepare_rows_interface( table_code ) {
//        var info_bt = table_code.find( '.app-tb-info-button>img' );

        var clickable = table_code.find( 'td.click' ).parent();
        var clickable_roots = clickable.filter( '.top' );

        var close_roots = clickable_roots.filter( '[data-open="false"]' );
        var open_roots = clickable_roots
                                .filter( '[data-open="true"]' )
                                .not( '.selected' );

        var clickable_in_select =  clickable.filter('.in-selected');
        var open_in_select = clickable_in_select.filter( '[data-open="true"]' );
        var close_in_select = clickable_in_select.filter( '[data-open="false"]' );

        var selected_root = $('tr.selected');
        var not_root = clickable.not( '.top' ).not( '.in-selected' );

        var all_buttons = table_code.find('button');

        all_buttons
            .click( show_breadcrumb_context_pressed );

        // EVENTS
        close_roots
            .click( open_node );
        selected_root
            .click( close_node );

        open_in_select
            .click( close_node );
        close_in_select
            .click( open_node );

        open_roots
            .click( reselect );
        not_root
            .click( reselect );


//        info_bt
//            .click( display_info_panel );
    }



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

    function show_rename_form() { // TODO test it
        var label;
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
            old_label = active_sheet_name();

            $('#app-tb-tl-title').hide();
            $('#app-tb-tl-rename-form')
                .show()
                // TODO bind enter key and esc key (at once)
                .submit( function () {
                    $('#app-tb-tl-rename-button').trigger('click');
                    return false;
                });

            $('#app-tb-tl-rename-input')
                .val( old_label )
                .select()
                .focus();
        }
    }

    function clear_table() {
        var sheet_id = active_sheet_id();
        // TODO make draw_sheet a direct callback
        var callback = function() {
            // TODO give me this id _resource
            draw_sheet( sheet_id );
        }
        _resource.clean_table( sheet_id, callback )
    }


    // Shows sort panel with event handlers defined and the first sort key.
    function display_sort_panel() {
        var sort_form_code = $( _tmpl.sort_form );
        prepare_sort_interface( sort_form_code );
        add_sort_key( sort_form_code );

        // TODO - add show and hide animations
        $('#app-tb-tl-srft-forms').children().remove();
        $('#app-tb-tl-srft-forms').append( sort_form_code );
    }

    // Shows filter panel with event handlers defined and the first filter key.
    function display_filter_panel() {
        var filter_form_code = $( _tmpl.filter_form );
        prepare_filter_interface( filter_form_code );
        add_filter_key( filter_form_code );

        // TODO - add show and hide animations
        $('#app-tb-tl-srft-forms').children().remove();
        $('#app-tb-tl-srft-forms').append( filter_form_code );
    }


    function display_add_columns( event ) {
        var sheet_id = active_sheet_id();

        var callback = function( columns ){
            var columns_object =  { 'columns': columns };
            var columns_form = M.to_html( _tmpl.columns_form, columns_object );

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

        _resource.all_columns( sheet_id, callback ); //TODO - not ready - test it

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
            console.log( data );
            draw_sheet( data['id'] );
        });
    }


    // TABLE EVENTS

    function open_node() {
        var sheet_id = active_sheet_id();
        var row = $(this);
        var row_id = get_id( row );

        var callback = function ( new_data ) {
            var new_rows = _table.generate_node( new_data );
            var rows_code = $(new_rows);

            row.after( rows_code );
            // TODO move it away from th callback
            add_selection( rows_code );
            prepare_rows_interface( rows_code );

            make_zebra();
            row
                .attr( 'data-open', 'true' )
                .click( close_node );
        }

        row.unbind( 'click' );

        _resource.get_children( sheet_id, row_id, callback )
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


    function display_info_panel() {

    }


    function close_node() {
        var sheet_id = active_sheet_id();
        var row = $(this);
        var row_id = get_id( row );
        var children = row.siblings( '[data-parent="' + row_id +'"]' );
        var open_children = children.filter( '[data-open="true"]' );

        open_children.trigger( 'click' ); //TODO remove by jQuery until next.data-parent === data-parent

        _resource.remove_children( sheet_id, row_id );
        children.remove();

        if ( row.hasClass( 'selected' ) ) {
            deselect();
        }
        make_zebra(); // TODO - how to make it only one time?

        row
            .attr( 'data-open', 'false' )
            .unbind( 'click' )
            .click( open_node );
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
        $('#app-sh-submit').show().click( function () {
            var checked = $('#app-sh-panel').find('input:checked').map( function () {
                                return $(this).attr('id');
                            });

            // no sheet selected
            if( !checked.length ) {
                return;
            }

            _resource.create_permalink( $.makeArray( checked ), function ( permalink_id ) {
                $('#app-sh-submit').hide();
                $('#app-sh-permalink').show()
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
        var add_key_button = sort_form.find('#app-tb-tl-sort-add');
        var submit_button = sort_form.find('#app-tb-tl-sort-submit');

        add_key_button.click( function () {
            add_sort_key();
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


    function add_sort_key( sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        var sheet_id = active_sheet_id();

        _resource.get_sortable_columns( sheet_id, function ( data ) {
            var placeholder = sort_form.find( 'tbody' );
            var keys = placeholder.children();
            var key_html;

            data['keys_num'] = keys.length;

            eliminate_redundant_keys( sort_form, data );
            key_html = M.to_html( _tmpl.sort_key, data );
            placeholder.append( key_html );

            if ( data['keys_num'] === data['columns'].length ||
                 _enum['MAX_KEYS'] === data['keys_num'] + 1 ){
                sort_form.find('#app-tb-tl-sort-add').hide();
            }
        });
    }


    function eliminate_redundant_keys( sort_form, data ) {
        var selected_columns = {};
        var column;
        var i;

        for ( i = 0; i < data['keys_num']; i += 1 ) {
            column = sort_form.find('.column-key-'+ i +':selected').val();
            selected_columns[ column ] = true;
        }

        data['columns'] = data['columns'].filter( function ( col ) {
            return !selected_columns[ col['key'] ];
        });
    }

    function prepare_filter_interface( filter_form ){
        var add_key_button = filter_form.find('#app-tb-tl-filter-add');
        var submit_button = filter_form.find('#app-tb-tl-filter-submit');

        add_key_button.click( function () {
            add_filter_key( );
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

    function add_filter_key( filter_form ) {
        var filter_form = filter_form || $('#app-tb-tl-filter-form');
        var sheet_id = active_sheet_id();

        _resource.get_filterable_columns( sheet_id, function ( data ) {
            var placeholder = filter_form.find( 'tbody' );
            var keys = placeholder.children();
            var key_html;
            var keys_num = keys.length;

            data['keys_num'] = keys_num;

            key_html = M.to_html( _tmpl.filter_key, data );
            placeholder.append( key_html );

            filter_form.find('#filter-'+ keys_num +'-columns').change( function () {
                var selected_column = $(this).val();
                var operations_html = get_operations( data['columns'], selected_column, keys_num );

                $('#filter-' + keys_num + '-operations').remove();
                $('#filter-'+ keys_num +'-query').val( '' );
                $(this).parent().next().append( $( operations_html ) );
            });

            if ( _enum['MAX_KEYS'] === keys_num + 1 ) {
                filter_form.find('#app-tb-tl-filter-add').hide();
            }
        });
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
    function add_selection( rows_code ){
        var sheet_id = active_sheet_id();

        var top_row = get_prev_top_row( rows_code );
        var top_row_id = get_id( top_row );

        var old_selected = $('tr.selected');
        var old_selected_row_id;

        if ( old_selected.length === 1 ) {
            old_selected_row_id = get_id( old_selected );
        }

        if ( old_selected_row_id !== top_row_id ) {
            select( rows_code );
            _resource.row_selected( sheet_id, top_row_id, old_selected_row_id );
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
                .click( close_node );
            after_row.unbind( 'click' );
            open_children.click( close_node );
            close_children.click( open_node );
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
