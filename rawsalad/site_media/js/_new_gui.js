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
    
    var counter = 0;
    that.init_gui = function () {
        $('#test-button-1').click( function( ) {
            _resource.get_top_level(100002, draw_new_table);
        });
        $('#test-button-2').click( function( ) {
            _resource.get_top_level(100005, draw_new_table);
        });
    };
    
    


// P R I V A T E   I N T E R F A C E
    // Create table.
    // IN:
    // data - data needed to draw table
    function draw_table( data ) {
        var table_code;
        var table_type = data['type'];
        var table_data = data['data'];
        var columns = data['columns'];
        
        table_code = _table.create_table( table_data, columns, table_type );
        
        remove_table();
        show_table( table_code );
    }
    
    function draw_new_table( data ) {
        var draw_tab = function( name, id ) {
            var html_code = [];
            html_code = ['<button id=', id, '>'];
            html_code.push( name );
            html_code.push( '</button>' );
            
            return html_code.join('');
        };
        
        draw_tab( data['name'], data['id'], data['type'] );
        draw_table( data );
    }
    
    function remove_table() {
        $('#simpletable').empty();
    }
    
    function show_table( table_code ) {
        $('#simpletable').html( table_code );
        console.log( table_code );
    }
    
    return that;
    
})();
