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

    //===================================================//
    //          P U B L I C   I N T E R F A C E          //
    //===================================================//

    var that = {};

    that.init_gui = function() {

        _resource.get_collections_list( _dbtree.draw_db_tree );

        $('#pl-ch-submit').click( function() {
            var boxes = $('#pl-ch-datasets').find('.pl-tree-end-checked');
            var endpoints = $.makeArray( boxes.map( function ( e ) {
                                return $(this).attr('data-endpoint');
                            }));
            var callbacks = endpoints.map( function ( e ) {
                                return function ( d ) { console.log( d ) };
                            });

            _resource.get_top_levels( endpoints, callbacks );
            //draw_end_point( 'data_50001' );
        });

    };

    //=====================================================//
    //          P R I V A T E   I N T E R F A C E          //
    //=====================================================//



    /////////////////////////////////
    // D R A W   F U N C T I O N S //
    /////////////////////////////////


    function draw_end_point( endpoint ) {
        display_application_panel();
        _resource.get_top_level( endpoint, function ( data ) {
            draw_table( data );
            draw_tools( data );
            _resource.get_sheets_labels( draw_tabs );
        });
    }


    function draw_sheet( sheet_id ){
        _resource.get_sheet_data( sheet_id, draw_table );
        _resource.get_sheet_name( sheet_id, draw_tools );
        _resource.get_sheets_labels( draw_tabs );
    }


    function draw_tabs( data ) {
        var tabs;
        adjust_tabs_length( data );
        tabs = Mustache.to_html( _templates.app_table_header, data );
        display_tabs( tabs );
    }


    function draw_tools( names ) {
        var tools;
        tools = Mustache.to_html( _templates.app_table_tools, names );
        display_tools( tools );
    }


    function draw_table( data ) {
        var callback = function( table_html ) {
            display_table( table_html );
        };
        _table.create_table( data, callback );
    }



    ///////////////////////////////////////
    // D I S P L A Y   F U N C T I O N S //
    ///////////////////////////////////////


    // APLICATION PANEL

    function display_application_panel() {
        prepare_aplication_interface();
        $('#application').show();
    }


    // APPLICATION TABS

    function display_share_panel() {

        if( change_application_tab( $(this) ) ) {
            update_share_tab(); // TODO
            $('#app-share').show();
        }
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


    // APPLICATION TABS INTERFACE

    function prepare_aplication_interface() {
        var share_bt = $('#app-tbs-share');
        var table_bt = $('#app-tbs-table');

        // EVENTS
        share_bt
            .click( display_share_panel );

        table_bt
            .click( display_table_panel );
    }


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
            var new_sheet_id = data['sheet_id'];
            draw_sheet( data['sheet_id'] );
        }
        _resource.copy_sheet( sheet_id, callback );
    }


    // TOOLS EVENTS

    function show_rename_form() { // TODO test it
        var old_name

        if ( $('#app-tb-tl-rename-input').is(":visible")){
            var new_name = $('#app-tb-tl-rename-input').val();
            var callback = function(){
                _resource.get_sheets_labels( draw_tabs );
            };

            old_name = active_sheet_name();

            if ( ( new_name !== old_name ) && /\S/.test(new_name) ) {
                var sheet_id = active_sheet_id();

                _resource.change_name( sheet_id, new_name, callback );
                $('#app-tb-tl-title').html( new_name );
            }
            $('#app-tb-tl-rename-form').hide();
            $('#app-tb-tl-title').show();
        }
        else {
            old_name = $('#app-tb-tl-title').html();

            $('#app-tb-tl-title').hide();
            $('#app-tb-tl-rename-form')
                .show()
                .submit( function () {
                    $('#app-tb-tl-rename-button').trigger( $.Event( 'click' ) );
                    return false;
                });

            $('#app-tb-tl-rename-input')
                .val( old_name )
                .select()
                .focus();
        }
    }


    function clear_table() {
        var sheet_id = active_sheet_id();
        var callback = function() {
            draw_sheet( sheet_id );
        }
        _resource.clean_table( sheet_id, callback )
    }


    // TODO finish sort
    function display_sort_panel() {
        var sort_form_code = $( _templates.sort_form );
        preapare_sort_interface( sort_form_code );
        $('#app-tb-tools>section').append( sort_form_code ); // TODO - add show and hide animations
    }


    function display_filter_panel() {

    }


    function display_add_columns( event ) {
        var sheet_id = active_sheet_id();

        var callback = function( columns ){
            var columns_object =  { 'columns': columns, };
            var columns_form = Mustache.to_html( _templates.columns_form, columns_object );
            var columns_form_code = $(columns_form);

            $('#app-tb-tl-columns-list').append( columns_form );
            $('#app-tb-tl-columns-form').slideDown( 200 );
            $('html')
                .click( function () {
                    $('#app-tb-tl-columns-button')
                        .trigger( $.Event( 'click' ));
                });

            event.stopPropagation();
            prepare_columns_form_interface( columns_form );
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


    // not used yet:
    function sort_table() {

    }


    function filter_table() {

    }


    function add_columns() {

    }


    // TABLE EVENTS

    function open_node() {
        var sheet_id = active_sheet_id();
        var row = $(this);
        var row_id = get_id( row );

        var callback = function ( new_data ) {
            var new_rows = _table.generate_node( row_id, new_data );
            var rows_code = $(new_rows);

            row.after( rows_code );
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


    function display_info_panel() {

    }


    function close_node() {
        var sheet_id = active_sheet_id();
        var row = $(this);
        var row_id = get_id( row );
        var children = row.siblings( '[data-parent="' + row_id +'"]' );
        var open_children = children.filter( '[data-open="true"]' );

        open_children.trigger( 'click' );

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

    }


    // TABLE TABS FUNCTIONS

    function new_active_tab( button ) {
        var close_bt = $(_templates.close_sheet_button);
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
    function prepare_columns_form_interface( columns_form ) {

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


    // TODO - make sort
    function preapare_sort_interface( sort_form ){
        add_sort_key( sort_form );
    }


    function add_sort_key( sort_form ) {
        var sheet_id = active_sheet_id();
        var callback = function ( data ) {
            var keys = sort_form.find( 'tbody>tr' );
            var placeholder = keys.paren();
            var keys_num = keys.length;
            var key_html;

            if ( keys_num === data.columns.length ){
                $('#app-tb-tl-sort-add').hide();
            }
// TODO not need it - remove
//            else {
//                $('#app-tb-tl-sort-add').show()
//            }


            data['keys_num'] = keys_num;

            eliminate_desame_keys( sort_form, data ); //TODO
            key_html = Mustache.to_html( _templates.sort_key, data );
            placeholder.append( key_html );
        };

        _resource.get_sort_columns( sheet_id, callback )
    }


    //TODO
    function eliminate_desame_keys( srt_form, data ) {
        var columns_selector = srt_form.find( '#app-tb-tl-sort-form-columns' );
        var selected_columns = columns_selector.find( 'select option:selected' );
        // TODO remove from data if it's in selected columns


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


    // return public interface
    return that;

})();
