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
        row = $( '#' + row_id );
        var new_rows = '';    
    };
    
//  P R I V A T E   I N T E R F A C E
    function create_standard_table( data, callback ) {
        var header_code;
        var rows_code;
        var table_code;
        var table_tag;

 
        // prepare padding value for child rows
        data['rows'] = data['rows'].map( function ( row ) { // TODO - test it                                       
            if ( row['level'] > 1 ) {
                row['data']['0']['padding']['value'] = ( row['level'] - 1 ) * 10;
            } 
            return row;
        });
                        
                                     
        header_code = create_standard_header( data );
        rows_code = create_rows( data );
        
        table_code = header_code.concat( rows_code );
        
        callback( table_code);
    };

    
    function create_standard_header( data ) {
        var head_row_code;
        var standard_header_code;
        var total_row_code = '';        
        var total = data['total'] || false;

        head_row_code = Mustache.to_html( standard_head_row_template, data );

        if ( !!total ) {
            total_row_code = Mustache.to_html( standard_total_row_template, data );
        }
        
        standard_header_code = '<thead data-sheet-id="' + data['id'] + '">'
                                .concat( head_row_code, total_row_code, '</thead>' );

        return standard_header_code;
    };

        
    function create_rows( data ) {
        var tbody_code;
        
        tbody_code = Mustache.to_html( standard_tbody_template, data );
                
        return tbody_code;
    };


    // T E M P L A T E S
    var standard_head_row_template = 
        '<tr>' +
            '{{#columns}}' +
                '<td class="{{key}} {{type}}">' +
                    '{{label}}' +
                '</td>' +
            '{{/columns}}' +
        '</tr>';

                
    var standard_total_row_template =      
        '<tr>' +
            '{{#total}}' +        
                '<td class="{{column_key}} {{column_type}}">' +
                    '{{data}}' +
                '</td>' +    
            '{{/total}}' +
        '</tr>';
        

    var standard_tbody_template = 
        '<tbody>' +
            '{{#rows}}' + //TODO add info panel
                '<tr id="{{_id}}" data_open="{{is_open}}" ' +
                  'class="{{selected}} {{parent}}">' +
                    '{{#data}}' +
                        '<td class="{{column_key}} {{column_type}} {{click}}"' + //TODO add click in object
                          '{{#padding}}' +
                            'style="padding-left= {{value}}px;" ' +
                          '{{/padding}} '+
                          '>' +
                            '{{content}}' +
                        '</td>' +
                    '{{/data}}' +                                
                '</tr>' +
            '{{/rows}}' +
        '</tbody>';
            
    
    // return public interface
    return that;
})();

