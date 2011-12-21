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
            generate_app_table( 100002 );
            //_resource.get_top_level(100002, draw_app_table); // TODO change test environment
        });
        $('#test-button-2').click( function() {
            generate_app_table( 100005 );
//            _resource.get_top_level(100005, draw_app_table);
        });

        // stupid testing environment
        _resource.get_db_tree( draw_db_tree_panels );
        $.get(
            '/get_init_data/',
            {
                endpoint: 100002
            },
            function( d ) {
                console.log( 'Top level' );
                console.log( JSON.parse( d ) );
            }
        );
        $.get(
            '/get_children/',
            {
                endpoint: 100002,
                _id: 10000000
            },
            function( d ) {
                console.log( 'Children' );
                console.log( JSON.parse( d ) );
            }
        );
    };


// P R I V A T E   I N T E R F A C E



// TODO remove function
//    function draw_app_table( data ) {
        
//        generate_app_table( data );         





        // simple test environment TODO - remove
//        var create_tab = function( name, id ) {
//            var html_code = [];
//            html_code = ['<button id=', id, '>'];
//            html_code.push( name );
//            html_code.push( '</button>' );

//            return html_code.join('');
//        };
//        var tab_code = create_tab( data['name'], data['id'], data['type'] );
//        $('#tabs').append( tab_code );
//        $('#' + data['id']).click( function( tab ) {
//            draw_table( data );
//        });
        // end of test environment

//        draw_table( data ); // TODO remove this

//    }
    
    function generate_app_table( sheet_id ) {
        var result = {};
        
        var display_app_table = function() {
            if ( _.keys( result ).length !== 2 ) {
                return;
            }
            remove_table();  
            show_table( result );
        }
        
        // TODO its not ready in re test it
//        _resource.get_sheets_names( function( sheets ) {
//            // TODO add to 'sheet' 'active' = true if active      
//            result['header'] = Mustache.to_html( app_table_header_template, sheets );
//            display_app_table(); 
//        });
        result['header'] = '';
         
        _resource.get_top_level( sheet_id, function( data ) {
            var callback = function( table_html ) {                
                result['table'] = table_html;
            }
            _table.create_table( data, callback )
            display_app_table(); 
        });      
    }
             

    function draw_db_tree_panels( data ) {
        console.log( data );
    }

// TODO - remove this function
//    function draw_table( data ) { 
//        
//        var table_code;
//        table_code = _table.create_table( data );
//        remove_table(); // TODO - remove 
//        show_table( table_code, data['id'] );
//    }

    
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


    function remove_table() {

        $('#app-table>header').empty();
        $('#app-tb-tools').empty();
        $('#app-tb-datatable').empty();
    }


    function show_table( result ) {
                
        var app_header = result['header'];
        var app_tools = app_table_tools_template;
        var app_table = result['table'];
        
        //    TODO:    preapare_interface(); 
        $('#app-table>header').append( app_header );
        $('#app-tb-tools').append( app_tools );
        $('#app-tb-datatable').append( app_table );
        
        $('#application').show();
        make_zebra();
    }


    // T E M P L A T E S

    var app_table_header_template = //TODO test it
            '<div id="app-tb-save-sheet" class="blue button left">Kopiuj do arkusza</div>' +
            '<ul id="app-tb-sheets">' +
                '{{#sheet}}' +
                    '<li id="snap-{{sheet_id}}" class="sheet tab button' +
                        '{{#active}}' +
                            ' active' +
                        '{{/active}}' +
                    '" title="{{name}}">' +
                        '{{name}}' +
                    '</li>' +
                '{{/sheet}}' +                
            '</ul>';
        
    var app_table_tools_template = 
            '<section>' +
              '<h3 id="app-tb-tl-title" class="left"></h3>' +
              '<form id="app-tb-tl-rename-form" style="display: none;" class="left" >' +
                '<input type="text" class="input-text" id="app-tb-tl-rename-input" />' + 
              '</form>' +
              '<div id="app-tb-tl-old-title" class="left" style="display: none;" > </div>' +
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
            '</section>';
        
                  
    // return public interface    
    return that;

})();
