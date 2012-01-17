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


var _db = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};

    that.get_db_tree = function ( callback ) {
        $.ajax({
            url     : '/get_db_tree/',
            dataType: 'json',
            type    : 'GET',
            success : function ( received_data ) {
                callback( received_data );
            },
            error   : function ( err ) {
                console.log( err );
                callback( { 'error': err } );
            }
        });
    };

    // Gets the top-level from db
    that.get_init_data = function ( endpoint, callback ) {
        $.ajax({
            url     : '/get_init_data/',
            data    : { 'endpoint': endpoint },
            dataType: "json",
            success : function( received_data ) {
                var data = {
                    data : received_data.data,
                    meta : received_data.meta
                }
                callback( data );
            },
            error   : function ( err ) {
                console.log( err );
                callback( { 'error': err } );
            }
        });
    };

    that.get_children = function( endpoint, parent_id, callback ) {
        $.ajax({
            url     : '/get_children/',
            data    : {
                'endpoint' : endpoint,
                'parent_id': parent_id
            },
            dataType: "json",
            success : function( received_data ) {
                callback( received_data );
            },
            error   : function ( err ) {
                console.log( err );
                callback( { 'error': err } );
            }
        });
    };


    that.get_search_count = function ( scope, query, callback ) {
        var scope_str = JSON.stringify( scope );
        $.ajax({
            url     : '/search_count/',
            data    : {
                'scope': scope_str,
                'user_query': query
            },
            dataType: 'json',
            type    : 'GET',
            success : function( received_data ) {
                callback( received_data );
            },
            error   : function( err ) {
                console.log( err );
                callback( { 'error': err } );
            }
        });
    };

    that.get_search_data = function ( endpoint, query, get_meta, callback ) {
        $.ajax({
            url     : '/search_data/',
            data    : {
                'endpoint'  : endpoint,
                'user_query': query,
                'get_meta'  : get_meta
            },
            dataType: 'json',
            type    : 'GET',
            success : function( received_data ) {
                callback( received_data );
            },
            error   : function( err ) {
                console.log( err );
                callback( { 'error': err } );
            }
        });
    };
    
    that.store_state = function ( permalink_data, callback ) {
        $.ajax({
            url     : '/store_state/',
            data    : {
                'permalink_data': permalink_data
            },
            dataType: 'json',
            type    : 'POST',
            success : function( received_data ) {
                callback( received_data );
            },
            error   : function( err ) {
                console.log( err );
                callback( { 'error': err } );
            }
        });
    };

    return that;

})();
