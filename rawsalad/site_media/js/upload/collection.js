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

var collection = (function () {
    var that = {};

    that.init = function( collections, user_data ) {
        collections = prepare_collections( collections );
        
        show_user_collections( collections );
        add_handlers( collections );
    };

    var coll_elements = '{{#nodes}}' +
                        '<input id="node-{{id}}" type="radio" name="all_colls" value="{{id}}" {{checked}} {{disabled}}>{{tree_name}}<br>' +
                        '{{/nodes}}';
    
    var parent_panel = '<tr>' +
                       '<th> <label for="name-{{id}}">Name:</label> </th>' +
                       '<td> <input type="text" name="ancestor-name-{{id}}" id="name-{{id}}" field="ancestor"> </td>' +
                       '</tr>' +
                       '<tr>' +
                       '<th> <label for="desc-{{id}}">Description:</label> </th>' +
                       '<td> <input type="text" name="ancestor-desc-{{id}}" id="desc-{{id}}" field="ancestor"> </td>' +
                       '</tr>';

    function prepare_collections( collections ) {
        var levels = {};
        collections.forEach( function ( node ) {
            if ( !node['parent'] ) {
                levels[ node['id'] ] = 1
            } else {
                levels[ node['id'] ] = levels[ node['parent'] ] + 1;
            }
            node['level'] = levels[ node['id'] ];
            if ( !node['max_depth'] || !node['user_uploaded'] ) {
                node['disabled'] = 'disabled';
            }
            node['tree_name'] = get_tree_name( node['name'], node['level'] );
        });

        return collections;
    }

    function get_user_collections( collections ) {
        return collections.filter( function ( node ) {
            return node['user_uploaded'];
        });
    }

    function show_all_collections( collections ) {
        var html = M.to_html( coll_elements, { 'nodes': collections } );
        
        $('#collections-tree').empty()
                              .append( html );

        $('#parent-panel').show();
    }

    function show_user_collections( collections ) {
        var user_collections = get_user_collections( collections );
        var html = M.to_html( coll_elements, { 'nodes': user_collections } );

        $('#collections-tree').empty()
                              .append( html );

        $('#parent-panel').hide();
    }

    function add_handlers( collections ) {
        $('#add-exist').click( function () {
            show_user_collections( collections );
        });
        $('#add-new').click( function () {
            show_all_collections( collections );
        });
        $('#add-parent').click( function () {
            add_parent();
        });
        $('#del-parent').click( function () {
            del_parent();
        });
        $('#coll-form').submit( function () {
            clear_error();
            if ( !is_data_correct() ) {
                show_error( find_error() );
                return false;
            }
        });
    }

    function add_parent() {
        var parents_count = $('#parent-collections > tbody > tr').length / 2;
        var html = M.to_html( parent_panel, { 'id': parents_count } );
        $('#parent-collections > tbody').append( html );

        if ( parents_count == 1 ) {
            $('#del-parent').removeAttr('disabled')
        }
    }

    function del_parent() {
        var parents_count = $('#parent-collections > tbody > tr').length / 2;
        $('#parent-collections > tbody').children().last().remove();
        $('#parent-collections > tbody').children().last().remove();

        if ( parents_count == 2 ) {
            $('#del-parent').attr('disabled', 'disabled');
        }
    }

    function get_tree_name( name, level ) {
        var i;
        var level_part = '';
        for ( i = 1; i < level; ++i ) {
            level_part += '--';
        }

        return level_part + ' ' + name;
    }

    function is_data_correct() {
        return coll_fields_correct() && parent_fields_correct();
    }

    function coll_fields_correct() {
        return $('#coll-name').val() !== '' &&
               $('#coll-label').val() !== '' &&
               $('#coll-file').val() !== '';
    }

    function parent_fields_correct() {
        var all_filled = true;

        if ( $('#add-exist').attr('checked') ) {
            return $('input[name=all_colls]:checked').length == 1;
        } else {
            $('input[field=ancestor]').each( function () {
                all_filled = all_filled && $(this).val() !== '';
            })
            return all_filled;
        }
    }

    function show_error( error ) {
        $('#error').text( error );
    }

    function clear_error() {
        $('#error').text('');
    }

    function find_error() {
        if ( !coll_fields_correct() ) {
            if ( $('#coll-name').val() == '' ) {
                return 'Fill collection name';
            } else if ( $('#coll-label').val() == '' ) {
                return 'Fill collection label';
            } else if ( $('#coll-file').val() == '' ) {
                return 'Choose file with data';
            }
        } else if ( !parent_fields_correct() ) {
            if ( $('#add-exist').attr('checked') ) {
                return 'Check one of parents';
            } else {
                return 'Fill all information about parents';
            }
        }
    }

    return that;

})();

