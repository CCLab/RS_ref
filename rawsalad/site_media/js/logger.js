var _logger = (function () {
    var counter = 0;
    var that = {};

    that.log = function ( fn, debug ) {
        return function ( a, b, c, d, e, f ) {
            logger( fn, debug, arguments );
            if( !!debug ) {
                debugger;
            }
            fn( a, b, c, d, e, f );
        };
    };

    return that;

    function logger( fn, debug, args ) {
        var i;

        console.log( ">>> " + inc_counter() + " :: " + new Date() );
        console.log( ">>> In function: " + fn.name );
        if( !debug ) {
            for( i = 0; i < args.length; ++i ) {
                console.log( ">>> arg: " + JSON.stringify( args[i] ) );
            }
        }
    };

    function inc_counter() {
        counter += 1;

        return counter;
    }
})();
