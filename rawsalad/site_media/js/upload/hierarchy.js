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
        var activate_add_button;

        $('#hier-panel').append( html );
        get_aux_column( new_level ).attr('disabled', 'disabled');

        get_aux_checkbox( new_level ).click( function() {
            var aux_value;
            if ( $(this).attr('checked') === 'checked' ) {
                get_aux_column( new_level ).removeAttr('disabled');
            } else {
                aux_value = get_aux_column( new_level ).val();
                if ( aux_value !== '' ) {
                    get_aux_column( new_level )
                        .attr('prev_name', '')
                        .val('')
                        .find('option[name=""]')
                        .show();
                    show_option( aux_value );
                }
                get_aux_column( new_level ).attr('disabled', 'disabled');
            }
        });

        get_selected_options().forEach( function ( opt ) {
            hide_option( opt );
        });

        get_column( new_level ).change( function () {
            var activate_add_button = get_selected_options().length < labels.length;
            column_changed( $(this), activate_add_button );
        });
        get_aux_column( new_level ).change( function () {
            column_changed( $(this) );
        });
        if ( new_level == 1 ) {
            $('#del-hier').removeAttr('disabled');
        }
        $('#add-hier').attr('disabled', 'disabled');
    }

    function del_level() {
        var last_level = get_max_level();
        var column_name = get_column( last_level ).val();
        var aux_column_name = get_aux_column( last_level ).val();

        if ( column_name !== '' ) {
            show_option( column_name );
        }
        if ( aux_column_name !== '' ) {
            show_option( aux_column_name );
        }

        $('#level-col-' + last_level).remove();
        $('#level-aux-' + last_level).remove();
        $('#level-col-aux-' + last_level).remove();

        if ( last_level == 1 ) {
            $('#del-hier').attr('disabled', 'disabled');
        }
        $('#add-hier').removeAttr('disabled');
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
        $('#hier-form').hide();

        $('#submit').click( function () {
            var hierarchy = [];
            var last_level = get_max_level();
            var i;
            for ( i = 0; i <= last_level; ++i ) {
                hierarchy.push({
                    'index'    : labels.indexOf( get_column( i ).val() ),
                    'aux_index': labels.indexOf( get_aux_column( i ).val() )
                });
            }
            $('#hier-form')
                .find('input')
                .val( JSON.stringify( hierarchy ) )
                .end()
                .submit();
        });
    }

    function get_column( i ) {
        return $('#col-' + i);
    }

    function get_aux_checkbox( i ) {
        return $('#aux-' + i);
    }

    function get_aux_column( i ) {
        return $('#col-aux-' + i);
    }

    function column_changed( select, activate_button ) {
        var prev_option = select.attr('prev_name');
        var new_option = select.val();

        if ( prev_option === '' ) {
            select.find('option[name=""]').hide();
        } else {
            show_option( prev_option );
        }
        hide_option( new_option );
        select.attr( 'prev_name', new_option );
        if ( activate_button ) {
            $('#add-hier').removeAttr('disabled');
        }
    }

    function hide_option( name ) {
        $('select').each( function () {
            if ( $(this).val() !== name ) {
                $(this).find('option[name="' + name + '"]').hide();
            }
        });
    }

    function show_option( name ) {
        $('select').each( function () {
            $(this).find('option[name="' + name + '"]').show();
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


