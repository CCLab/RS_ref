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
        _resource.get_db_tree( draw_db_tree_panels );

    };


// P R I V A T E   I N T E R F A C E

    function draw_db_tree_panels( data ) {
            
        console.log( data );
    }


    
    function draw_end_point( end_id ) {
    
        _resource.get_sheets_names( draw_tabs ); // TODO - not ready in resources
        _resource.get_end_name( end_id, draw_tools ); // TODO - not ready in resources
        _resource.get_top_level( end_id, draw_table );

        $('#application').show();
    }
    
        
        
        
        
    function draw_tabs( sheets ) {
        // TODO add to 'sheet' 'active' = true if active 
        
             
        tabs = Mustache.to_html( app_table_header_template, sheets );
        display_tabs( tabs );     
    }


    function draw_tools( names ) {
        var tools
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
             
             
    // COLUMNS BUTTON FUNCTIONS
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


    function prepare_tools_interface( panel ){
        var rename_bt = panel.find('#app-tb-tl-rename-button');
        var clean_bt = panel.find('#app-tb-tl-clear-button');
        var sort_bt = panel.find('#app-tb-tl-sort-button');
        var filter_bt = panel.find('#app-tb-tl-filter-button');
        var columns_bt = panel.find('#app-tb-tl-columns-button');
    
        prepare_columns_bt( columns_bt );    
    }

    function display_tabs( tabs ){
        //    TODO:    preapare_tabs_interface(); 
        $('#app-table>header').empty();
        $('#app-table>header').append( tabs );    
    }


    function display_tools( tools ){
        $('#app-tb-tools').empty();
        // prepare_tools_interface( app_tools );
        $('#app-tb-tools').append( tools );
        
    }


    function display_table( table ) {
        // TODO add table interface
        $('#app-tb-datatable').empty();
        $('#app-tb-datatable').append( table );
        make_zebra();    
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


    // T E M P L A T E S

    var app_table_header_template = //TODO test it
        '<div id="app-tb-save-sheet" class="blue button left">Kopiuj do arkusza</div>' +
        '<ul id="app-tb-sheets">' +
            '{{#sheets}}' +
                '<li id="snap-{{..sheet_id}}" class="sheet tab button' + // TODO change sheet_id for end_id
                  //  '{{#.active}}' +
                  //      ' active' +
                  //  '{{/.active}}' +
                '" title="{{..name}}">' +
                    '{{..name}}' +
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
