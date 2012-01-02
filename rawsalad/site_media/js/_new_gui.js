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
        $('#test-button-1').click( function() {
            draw_end_point( 100002 );
        });
        $('#test-button-2').click( function() {
            draw_end_point( 100005 );
        });
        // stupid testing environment
//      _resource.get_db_tree( draw_db_tree_panels );
    };


// P R I V A T E   I N T E R F A C E

    // D R A W   F U N C T I O N S
    function draw_db_tree_panels( data ) {
            
        console.log( data );
    }

    
    function draw_end_point( end_id ) {
    
        _resource.get_top_level( end_id, function ( data ) {
            console.log(data);
            var names = { 'name': data['name'], }; 
            draw_table( data );
            _resource.get_sheets_names( draw_tabs );
            draw_tools( names );                
        });
                
        prepare_aplication_interface();
        $('#application').show();
    }
    
    
    function draw_sheet( sheet_id ){
        var callback = function ( data ) {
            draw_table( data );
            _resource.get_sheets_names( draw_tabs );            
        }
        _resource.get_sheet_name( sheet_id, draw_tools );
        _resource.get_sheet( sheet_id, callback ); 
    }
    
                   
    function draw_tabs( data ) {
             
        tabs = Mustache.to_html( app_table_header_template, data );
        display_tabs( tabs );     
    }


    function draw_tools( names ) {
        var tools;
        tools = Mustache.to_html( app_table_tools_template, names );
        display_tools( tools );             
    }


    function draw_table( data ) {
        var table;
        var callback = function( table_html ) {                
            table = table_html;
            display_table( table ); 

        }
        _table.create_table( data, callback );    
    }
             
             
    // D I S P L A Y   F U N C T I O N S
    function display_tabs( tabs ) { // TODO - tabs length
        // active table is loaded
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
        prepare_table_interface( table_code );
        $('#app-tb-datatable').empty();
        $('#app-tb-datatable').append( table_code );
        make_zebra();    
    }
    
    
    // P R E A P A R E   I N T E R F A C E   F U N C T I O N S
    // APPLICATION TABS
    function prepare_aplication_interface() {
        var share_bt = $('#app-tbs-share');
        var table_bt = $('#app-tbs-table');
        
        share_bt
            .click( display_share_panel );
            
        table_bt
            .click( display_table_panel );                    
    }
    
    
    function preapare_tabs_interface( tabs_code ) {
        
        var copy_bt = tabs_code.closest('#app-tb-save-sheet');
        var tabs = tabs_code.find('li');
        var close_bt = tabs_code.find('.close-sheet-button');
        
        
        // EVENTS
        tabs
            .click( change_sheet );
        
        close_bt
            .click( close_sheet );
        
        copy_bt
            .click( copy_sheet );
    }
    
    
    function prepare_tools_interface( tools_code ) {
        var rename_bt = tools_code.find('#app-tb-tl-rename-button');
        var clear_bt = tools_code.find('#app-tb-tl-clear-button');
        var sort_bt = tools_code.find('#app-tb-tl-sort-button');
        var filter_bt = tools_code.find('#app-tb-tl-filter-button');
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
            .click( display_columns_form );    
    }


    function prepare_table_interface( table_code ) {
        var clickable_rows = table_code.find('tr.click');
        var info_bt = table_code.find('.app-tb-info-button>img');
        
        // EVENTS
        clickable_rows
            .click( open_node );
            
        info_bt
            .click( display_info_panel );
    }
    
    
    // E V E N T S   F U N C T I O N S    

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


    function change_application_tab( button ){

        if ( button.hasClass('active') ) {
            return false;
        }        

        button.siblings().removeClass('active');
        button.addClass('active');        
        $('.app-container:visible').hide();

        return true;    
    }

        
    // TABS EVENTS
    function change_sheet() {
        var sheet_id;
        if ( $(this).hasClass('active') ) {
            return;
        }
        sheet_id = get_sheet_id( $(this) );
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
        var new_sheet_id;
        var sheet_id = active_sheet_id();

        var callback = function( data ) {
            new_sheet_id = data['sheet_id'];
            draw_sheet( new_sheet_id );
        }
        _resource.copy_sheet( sheet_id, callback );    
    }

    
    function change_active_tab_name( new_name ) {
        var tab = $('#app-tb-sheets>.active>p');
        tab.text( new_name );
    }
    

    function active_tab_name() {
        var tab = $('#app-tb-sheets>.active');
        
        return tab.text();
    }

        
    // TOOLS EVENTS
    function show_rename_form() { // TODO test it
        
        if ( $('#app-tb-tl-rename-input').is(":visible")){
            var new_name = $('#app-tb-tl-rename-input').val();
            var old_name = active_tab_name();
            if ( new_name !== old_name ) {
                var sheet_id = active_sheet_id();
                
                $('#app-tb-tl-title').html( new_name );                
                _resource.change_name( sheet_id, new_name );
                change_active_tab_name( new_name ); 
            }
            $('#app-tb-tl-rename-form').hide();
            $('#app-tb-tl-title').show();            
        }
        else {
            var old_name = $('#app-tb-tl-title').html();
 
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
    
    }
    

    function display_sort_panel() {
    
    }


    function display_filter_panel() {
    
    }
    

    function display_columns_form() {
    
    }

    function rename_sheet() {
        var new_name = $('#app-tb-tl-rename-input').val();
        var sheet_id = active_sheet_id();
        
        _resource.change_name( sheet_id, new_name );
        return false;
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
    
    }
    

    function display_info_panel() {
    
    }
    

    // not used yet:
    function close_node() {
    
    }
    

    // PERMALINK EVNTS
    // not used yet:
    function close_node() {
    
    }
    

    // SHARE TABLE    
    function update_share_tab() { //TODO
        
    }
        

    // TABS FUNCTIONS
    function new_active_tab( button ) { 
        var close_bt = $(close_sheet_button);
        var siblings = button.siblings();
                
        siblings.removeClass('active');
        siblings.find('.close-sheet-button').remove(); 

        button.addClass('active');
        if ( siblings.length > 0 ) {
            button.append( close_bt );
        }
    }
    
    function set_active_tab( tabs_code ) {
        var table_header = $('#app-tb-datatable>thead');
        var active_sheet_id = table_header.attr( 'data-sheet-id' );
        var active_snap_id = 'snap-' + active_sheet_id;
        var active_tab_bt = tabs_code.find('#' + active_snap_id );

        new_active_tab( active_tab_bt );        
    } 
        
    
    function after_close_id() {
        var new_sheet_id;
        var active_tab = $('#app-tb-sheets').find('.active');
        var active_group = active_tab.attr( 'data-group' );
        var siblings = active_tab.siblings();
        var group_sheets = siblings.filter( function () {
           return ( $(this).attr( 'data-group' ) === active_group ); 
        } );
                
        if ( group_sheets.length > 0 ) {
            new_sheet_id = parse_id_num( group_sheets[0]['id'] );
        }
        else {
            var siblings = active_tab.siblings();
            new_sheet_id = parse_id_num( siblings[0]['id'] );            
        }
        return new_sheet_id;
    }


    function active_sheet_id() {
        var sheet_tab = $('#app-tb-sheets').find('.active');
        var tab_id = sheet_tab.attr('id');
        var sheet_id = parse_id_num( tab_id );

        return sheet_id;
    }
    
    
    function get_sheet_id( tab ) {
        var tab_id = tab.attr('id');
        var sheet_id = parse_id_num( tab_id );
        return sheet_id;        
    }

    
    function parse_id_num( tab_id ) {
        var sheet_id = tab_id.split('-')[1];
        return sheet_id;
    }




    
    
    
    




             
    // C O L U M N S   B U T T O N   F U N C T I O N S
    function hide_columns_form() {
        $(this).unbind;
        $('#app-tb-tl-columns-form').slideUp( 200 );
        $('#app-tb-tl-columns-form').empty();
        $(this).click( show_columns_form );    
    }


    function show_columns_form() {
        $(this).unbind;
        var callback = function( columns ){

            var columns_form = $(Mustache.to_html( columns_form_template, { 'columns': columns, } ) );

            prepare_columns_form_bt( columns_form );    // TODO

            $('#app-tb-tools')
                .find('form:visible')
                .slideUp( 200 );
                
            $('#app-tb-tl-columns-list').append( columns_form );
            
            // show the form
            $('#app-tb-tl-columns-form').slideDown( 200 );
                
            $('html')
                .click( function () {
                    $('#app-tb-tl-columns-button')
                        .trigger( $.Event( 'click' ));
                });
           // event.stopPropagation(); TODO - need it?
                
        };
        
//        _resource.all_columns( end_id, callback ); TODO - not ready - test it
        
        $(this).click( hide_columns_form );
    }
    
    
    function prepare_columns_form_bt( columns_form ) {
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
                var checkboxes = $('input[name=app-tb-tl-columns]:checked');
                var callback = function(){
        //            draw_sheet( // TODO finish submit
                };
                });

                // to prevent form's action!!
                return false;
    
    }

    
    function prepare_columns_bt( button ) {
        button.click( show_columns_form );    
    }

    // END OF COLUMNS BUTTON FUNCTIONS

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


    // T E M P L A T E S

    var app_table_header_template = 
        '<div id="app-tb-save-sheet" class="blue button left">Kopiuj do arkusza</div>' +
        '<ul id="app-tb-sheets">' +
            '{{#sheets}}' +
                '<li id="snap-{{sheet_id}}" data-end-point="{{end_id}}" data-group="{{group_id}}" class="sheet tab button' + 
//                    '{{#active}}' + //TODO remove = not neaded
//                        ' active' +
//                    '{{/active}}' +
                '" title="{{name}}">' +
                    '<p>' +
                    '{{name}}' +
                    '</p>' +
                    '{{#close}}' +
                        '<div class="close-sheet-button button">x</div>' +
                    '{{/close}}' +
                '</li>' +
            '{{/sheets}}' +                
        '</ul>';
        
    var app_table_tools_template = 
        '<section>' +
            '<h3 id="app-tb-tl-title" class="left">{{name}}</h3>' +
            '<form id="app-tb-tl-rename-form" style="display: none;" class="left" >' +
                '<input type="text" class="input-text" id="app-tb-tl-rename-input" />' + 
            '</form>' +
            '{{#old_name}}' +
                '<div id="app-tb-tl-old-title" class="left"> {{old_name}} </div>' +
            '{{/old_name}}' +
            '{{^old_name}}'+
                '<div id="app-tb-tl-old-title" class="left" style="display: none;"> </div>' +
            '{{/old_name}}' +
            '<div id="app-tb-tl-old-title" class="left" style="display: none;"> </div>' +
            '<div id="app-tb-tl-rename-button" class="button left">Zmień nazwę</div>' +
            '<div id="app-tb-tl-bt-container" class="right">' +
                '<div id="app-tb-tl-clear-button" class="button left">Wyczyść tabelę</div>' +
                '<div id="app-tb-tl-sort-button" class="button left">Sortuj</div>' +
                '<div id="app-tb-tl-filter-button" class="button left">Filtruj</div>' +
            '</div>' +
        '</section>' +
        '<section>' +
            '<div id="app-tb-tl-columns-button" class="button right">Dodaj/Usuń kolumny</div>' +
            '<br class="clear"/>' +
            '<div id="app-tb-tl-columns-list" class="right"></div>' +
        '</section>';
        
    var close_sheet_button = '<div class="close-sheet-button button">x</div>';


    var columns_form_template = 
        '<form id="app-tb-tl-columns-form" style="display: none;">' +
            '<div id="app-tb-tl-lt-select" class="grey button left">Zaznacz wszystkie</div>' +
            '<div id="app-tb-tl-lt-unselect" class="grey button left">Odznacz wszystkie</div>' +
            '<div id="app-tb-tl-lt-submit" class="blue button left">Dodaj/Usuń</div>' +
            '<br class="clear" />' +
            '<table>' +
                '<tbody>' +
                    '{{#columns}}' +
                        '<tr>' +
                            '<td class="columns">' +
                                '<input type="checkbox" name="app-tb-tl-columns" value="{{key}}" id="column-id-{{key}}"' +
                                    '{{#selected}}' +
                                        'checked' +
                                    '{{/selected}}' +                                
                                '>' + 
                            '</td>' +
                            '<td class="columns">' +
                                '<label for="column-id-{{key}}">' +
                                    '{{label}}' +
                                '</label>' +
                            '</td>' +
                        '</tr>' +
                    '{{/columns}}' +
                '</tbody>' +
            '</table>' +
        '</form>';
        
                  
    // return public interface    
    return that;

})();
