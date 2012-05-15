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

var hierarchy = (function () {
    var that = {};

    that.init = function( labels ) {
        /*collections = prepare_collections( collections );
        show_user_collections( collections );*/
        labels = prepare_labels( labels );
        add_handlers( labels );
        add_level( labels );
    };

    var hier_el = '<tr id="level-col-{{id}}">' +
                    '<th> <label for="col-{{id}}">Column:</label> </th>' +
                    '<td> <select name="col-name-{{id}}" prev_name="" id="col-{{id}}">' +
                      '<option name=""></option>' +
                      '{{#labels}}' +
                        '<option name="{{.}}">{{.}}</option>' +
                      '{{/labels}}' +
                    '</select> </td>' +
                  '</tr>' +
                  '<tr id="level-aux-{{id}}">' +
                    '<th> </th>' +
                    '<td> <input type="checkbox" name="aux-{{id}}" id="aux-{{id}}">use auxiliary column</td>' +
                  '</tr>'+
                  '<tr id="level-col-aux-{{id}}">' +
                    '<th> <label for="col-aux-{{id}}">Auxiliary column:</label> </th>' +
                    '<td> <select name="col-aux-name-{{id}}" prev_name="" id="col-aux-{{id}}">' +
                      '<option name=""></option>' +
                      '{{#labels}}' +
                        '<option name="{{.}}">{{.}}</option>' +
                      '{{/labels}}' +
                    '</select> </td>' +
                  '</tr>';

    function prepare_labels( labels ) {
        var labels_map = {};
        labels.forEach( function ( e ) {
            labels_map[ e ] = 0;
        });
        return labels.map( function( label ) {
            labels_map[ label ] += 1;
            if ( labels_map[ label ] === 1 ) {
                return label;
            } else {
                return label + labels_map[ label ];
            }
            return new_label;
        });
    }

    function add_level( labels ) {
        var new_level = 1 + get_max_level();
        var html = M.to_html( hier_el, { 'id': new_level, 'labels': labels } );

        $('#hier-panel').append( html );
        get_aux_column( new_level ).attr('disabled', 'disabled');

        get_aux_checkbox( new_level ).click( function() {
            if ( $(this).attr('checked') === 'checked' ) {
                get_aux_column( new_level ).removeAttr('disabled');
            } else {
                get_aux_column( new_level ).attr('disabled', 'disabled');
            }
        });

        if ( new_level == 1 ) {
            $('#del-hier').removeAttr('disabled');
        }
        get_selected_options().forEach( function ( opt ) {
            hide_option( opt );
        });
    }

    function del_level() {
        var last_level = get_max_level();

        if ( $('#level-col-' + last_level).val() !== '' ) {
            show_option( $('#level-col-' + last_level).val() );
        }
        if ( $('#level-col-aux-' + last_level).val() !== '' ) {
            show_option( $('#level-col-aux-' + last_level).val() );
        }

        $('#level-col-' + last_level).remove();
        $('#level-aux-' + last_level).remove();
        $('#level-col-aux-' + last_level).remove();

        if ( last_level == 1 ) {
            $('#del-hier').attr('disabled', 'disabled');
        }
    }

    function get_max_level() {
        return ( $('#hier-panel > tbody > tr').length / 3 ) - 1;
    }

    function add_handlers( labels ) {
        $('#del-hier').attr('disabled', 'disabled');
        $('#add-hier').click( function () {
            add_level( labels );
        });
        $('#del-hier').click( function () {
            del_level();
        });
    }

    function get_column( i ) {
        return $('#level-col-' + i);
    }

    function get_aux_checkbox( i ) {
        return $('#level-aux-' + i);
    }

    function get_aux_column( i ) {
        return $('#level-col-aux-' + i);
    }

    function remove_from_sort_keys( col_key, good_key ) {
        var keys = sort_form.find('select').children();

        keys.each( function ( i ) {
            if ( i !== good_key ) {
                get_sort_key_name( i, sort_form )
                    .find('[value=' + col_key + ']')
                    .hide()
            }
        });
    }

    function add_to_sort_keys( col_key, sort_form ) {
        var sort_form = sort_form || $('#app-tb-tl-sort-form');
        var keys = sort_form.find( 'tbody' ).children();

        keys.each( function ( i ) {
            get_sort_key_name( i, sort_form )
                .find('[value=' + col_key + ']')
                .show()
        });
    }

    function hide_option( name ) {
        $('select').each( function () {
            if ( $(this).val() !== name ) {
                $(this).find('option[name=' + name + ']').hide();
            }
        });
    }

    function show_option( name ) {
        $('select').each( function () {
            $(this).find('option[name=' + name + ']').show();
        });
    }

    function get_selected_options() {
        return $('#hier-panel > tbody')
            .find('select')
            .map( function () {
                return $(this).val();
            })
            .toArray()
            .filter( function ( e ) {
                return e !== '';
            });
    }

    return that;

})();


