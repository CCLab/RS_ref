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

var _test = (function () {

//  P U B L I C   I N T E R F A C E
    var that = {};

    // No total in download
    that.seq_1 = function() {
        $('#node-1000').click();
        $('#node-1001').click();
        $('#endpoint-1003').click();
        $('#pl-ch-submit').click();
        $('#tm-download').click();
        setTimeout( function() {
            $('#10000').click();
            $('#pl-ch-submit').click();
        }, 500 );
    };

    // No undefined in total
    // No 2 total rows
    that.seq_2 = function() {
        $('#node-1000').click();
        $('#node-1001').click();
        $('#endpoint-1003').click();
        $('#pl-ch-submit').click();
        setTimeout( function() {
            $('#app-tb-tl-columns-button').click();
            $('#column-id-dot_sub').click();
            $('#app-tb-tl-lt-submit').click();
        }, 500 );
    };

    return that;
}) ();

