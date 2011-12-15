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

var _table = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};
    
    that.create_table = function( table_data, columns, type) {
        var table_code;
        
        switch ( type ) {
            case 'STANDARD':
                table_code = create_standard_table( table_data, columns );
                break;
            case 'FILTERED':
                table_code = create_filtered_table( table_data, columns );
                break;
            case 'SEARCHED':
                table_code = create_searched_table( table_data, columns );
                break;
            default:
                _assert.assert( true, '_table:create_table:wrong table type' );
        };
        
        return table_code;
    };

    return that;

//  P R I V A T E   I N T E R F A C E
    function create_standard_table( rows, columns ) {
        var header_code;
        var rows_code;
        var table_code;
        
        header_code = create_header( columns );
        rows_code = create_rows( rows, columns );
        table_code = header_code + rows_code;
        
        return header_code + '\n' + rows_code;
    };
    
    function create_header( columns ) {
        var header_code = [];
        header_code.push('<');
        columns.forEach( function ( column ) {
            header_code.push( column['label'] );
        });
        header_code.push('<br>');
        
        return header_code.join(' ');
    };
    
    function create_rows( data, columns ) {
        var rows_code = [];
        
        data.forEach( function ( row ) {
            columns.forEach ( function ( column ) {
                rows_code.push( row[ column['key'] ] );
            });
            rows_code.push('<br>');
        });
        
        return rows_code.join(' ');
    };

})();

