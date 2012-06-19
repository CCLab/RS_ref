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


    that.generate_node = function( data ) {
        var new_rows = create_rows( data );
        return new_rows;
    };

    that.generate_search_box = function( data, i ) {
        return create_search_box( data['boxes'], i );
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

        callback( table_code );
    }

    function create_filtered_table( data, callback ) {
        var header_code;
        var boxes_code;
        var table_code;

        header_code = create_standard_header( data );
        boxes_code = create_filtered_boxes( data['boxes'] );
        table_code = header_code.concat( boxes_code );

        callback( table_code );
    }

    function create_searched_table( data, callback ) {
        var header_code;
        var boxes_code;
        var table_code;

        header_code = create_standard_header( data );
        boxes_code = create_searched_boxes( data );
        table_code = header_code.concat( boxes_code ); 

        callback( table_code ); 
//          callback( boxes_code );
    }

    function create_search_box( box, i ) {
        // Prepare box for templates
        box['box_id'] = i;
        box['columns_num'] = box['columns'].length;

        box['breadcrumb_action'] = (box['breadcrumb_showed']) ? translation['js_hide_parents'] : translation['js_show_parents'];
        if ( box['empty_context'] ) {
            box['context_action'] = translation['empty_context'];
        } else {
            box['context_action'] = (box['context_showed']) ? translation['js_hide_context'] : translation['js_show_context'];
        }

        if ( box['breadcrumb_showed'] ) {
            return M.to_html( _tmpl.search_box_breadcrumbed, box );
        } else {
            return M.to_html( _tmpl.search_box, box );
        }
    }

    function create_searched_boxes( data ) {
        var boxes_html = [];
        var tbody_html = [];
        var boxes = data['boxes'];
        

        boxes.forEach( function ( box, i ) {
            box['columns'] = data['columns'];            
            boxes_html.push( create_search_box( box, i ) );
        });

        tbody_html.push( '<tbody id="app-tb-search-result" >' );
        tbody_html.push( boxes_html );
        tbody_html.push( '</tbody>' );

        return tbody_html.join('');
    }

    function create_filtered_boxes( boxes ) {
        var boxes_html = [];

        boxes.forEach( function ( box ) {
            boxes_html.push( M.to_html( _tmpl.filter_box, box ) );
        });

        return boxes_html.join('');
    }


    function create_standard_header( data ) {
        var head_row_code = '';
        var total_row_code = '';
        var standard_header_code;

        if ( data['type'] !== 2 ) { // it is not search result
            head_row_code = M.to_html( _tmpl.standard_head_row, data );

            if ( !!data['total'] ) {
                total_row_code = M.to_html( _tmpl.standard_total_row, data );
            }
        }

        // TODO clean concat, +, join, push etc
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

        rows_code = M.to_html( _tmpl.standard_rows, data );

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
