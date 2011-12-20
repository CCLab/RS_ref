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

    that.init_gui = function () {
        $('#test-button-1').click( function () {
            _resource.get_top_level(100002, draw_app_table);
        });
        $('#test-button-2').click( function () {
            _resource.get_top_level(100005, draw_app_table);
        });

        // stupid testing environment
        _resource.get_db_tree( draw_db_tree_panels );
        $.get(
            '/get_init_data/',
            {
                endpoint: 100002
            },
            function ( d ) {
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
            function ( d ) {
                console.log( 'Children' );
                console.log( JSON.parse( d ) );
            }
        );
    };


// P R I V A T E   I N T E R F A C E

    function draw_app_table( data ) {
        
        //generate_app_table_code( data );         



        // simple test environment
        var create_tab = function( name, id ) {
            var html_code = [];
            html_code = ['<button id=', id, '>'];
            html_code.push( name );
            html_code.push( '</button>' );

            return html_code.join('');
        };
        var tab_code = create_tab( data['name'], data['id'], data['type'] );
        $('#tabs').append( tab_code );
        $('#' + data['id']).click( function ( tab ) {
            draw_table( data );
        });
        // end of test environment


        draw_table( data ); // TODO remove this
        $('#application').show();
        make_zebra();
    }
    
    function generate_app_table_code( data ) {
        var app_table_code;    
        var header_code;
        var main_pan_code;
        var main_pan_content;
        var tools_code;
        var table_code;
        
        //var sheets = _resource.get_sheets_names(); TODO - not ready in resources
        
        
        // TODO add to 'sheet' 'active' = true if active      
        //app_table_header_code = Mustache.to_html( app_table_header_template, sheets );


// TODO tools_code = prepare tools code
        table_code = _table.create_table( data );        


        main_pan_content = {
                    'tools': tools_code,
                    'table': table_code,
                    }; 
        main_pan_code = Mustache.to_html( app_table_main_pan_template, main_pan_content );

        
        app_table_code = app_table_header_code.concat( app_table_main_pan_code );
        return app_table_code;    
    }


    function draw_db_tree_panels( data ) {
        console.log( data );
    }


    function draw_table( data ) { // TODO - remove this function
        
        var table_code;
        table_code = _table.create_table( data );
        remove_table(); // TODO - remove 
        show_table( table_code, data['id'] );
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


    function remove_table() {
        $('#app-tb-datatable').empty();
    }


    function show_table( table_code, table_id ) {
        $('#app-tb-datatable').append( table_code );
    }


    // T E M P L A T E S

    var app_table_header_template = //TODO test it
        '<header>' +
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
            '</ul>' +
        '</header>';
        
    var app_table_main_pan_template = 
        '<section class="panel-main">' +
          '<section id="app-tb-tools">' +
            '{{tools}}' +
          '</section>' +
          '<table id="app-tb-datatable">' +
            '{{table}}' +
          '</table>' +
        '</section>';
              
    var app_table_tools_template = '' //TODO prepare this
    

    // return public interface    
    return that;

})();
