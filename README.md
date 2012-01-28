# node-mmemoize
Memoize asynchronous function calls using memcached

## Usage

    var Memcached = require('memcached'),
        mmemoize = require('mmemoize');

    var memcached = new Memcached('localhost:11211'),
        mmemoizer = mmemoize(memcached, { ttl: 120 }); // in seconds

    var a = function (/* someArguments, */ callback) {
       // some potentially expensive computations, database fetches etc.
       // ...
       return callback(potentialErrors, theResult);
    }

    a = mmemoizer.memoize(a, 'a');
    a(/* someArguments, */ function (err, result) {
       // process results
       // ...
    });

    // just in case:
    a = a.dememoize(); // or: a = mmemoizer.dememoize(a);

## Deployment dependencies
- [node-memcached](https://github.com/3rd-Eden/node-memcached) (of course)

## Tests
- using [nodeunit](https://github.com/caolan/nodeunit)
- with running memcached instance (of course)
- `$ nodeunit tests/tests.js`
