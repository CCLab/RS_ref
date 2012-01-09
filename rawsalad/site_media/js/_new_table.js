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
    

    that.create_table = function( data, callback ) {
        var type = data['type'];
        
        
        switch ( type ) {
            case _enum.STANDARD:
                create_standard_table( data, callback );
                break;
            case _enum.FILTERED:
                create_filtered_table( data, callback );
                break;
            case _enum.SEARCHED:
                create_searched_table( data, callback );
                break;
            default:
                _assert.assert( true, '_table:create_table:wrong table type' );
        };
    };
    

    that.add_node = function( row_id, data ) {
        var new_rows = create_rows( data );
        return new_rows;        
    };
    

//  P R I V A T E   I N T E R F A C E
    
    // CREATE FUNCTIONS
    function create_standard_table( data, callback ) {
        var header_code;
        var tbody_code;
        var table_code;
        var table_tag;
 
                                     
        header_code = create_standard_header( data );
        tbody_code = create_tbody( data );
        
        table_code = header_code.concat( tbody_code );
        
        callback( table_code);
    }

    
    function create_standard_header( data ) {
        var head_row_code;
        var standard_header_code;
        var total_row_code = '';        
        var total = data['total'] || false;

        head_row_code = Mustache.to_html( _templates.standard_head_row, data );

        if ( !!total ) {
            total_row_code = Mustache.to_html( _templates.standard_total_row, data );
        }
        
        standard_header_code = '<thead data-sheet-id="' + data['id'] + '">'
                                .concat( head_row_code, total_row_code, '</thead>' );

        return standard_header_code;
    }


    function create_tbody( data ) {
        var rows_code = create_rows( data );// TODO add and test selected
        var tbody_code = '<tbody>'.concat( rows_code, '</tbody>' );
        
        return tbody_code;
    }

        
    function create_rows( data ) {
        var rows_code;

        add_rows_padding( data );                        
        
        rows_code = Mustache.to_html( _templates.standard_rows, data );
                
        return rows_code;
    }

    
    //OTHER FUNCTIONS
    // prepare padding value for child rows
    function add_rows_padding( data ) {
        data['rows'] = data['rows'].map( function ( row ) { // TODO - test it                                       
            if ( row['level'] > 1 ) {
                row['data']['0']['padding'] = { 'value': ( row['level'] - 1 ) * 10, };
            } 
            else {
                row['top_level'] = 'top';
            }
            
             
            return row;
        });    
    }

    
    // return public interface
    return that;
})();

