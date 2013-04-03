# node-mmemoize
Memoize asynchronous function calls using memcached

## Installation

    $ npm install mmemoize

## Usage

    var mmemoize = require('mmemoize');

    var mmemoizer = mmemoize('localhost:11211' /*, ..., config */);

    // or:
    // var Memcached = require('memcached'),
    //     memcached = new Memcached('localhost:11211' /*, ...*/),
    //     mmemoizer = mmemoize(memcached /*, config */);

    var a = function (/* someArguments, */ callback) {
       // some potentially expensive computations, database fetches etc.
       // ...
       return callback(potentialErrors, theResult);
    }

    a = mmemoizer.memoize(a, 'a' /*, customTTL */);
    a(/* someArguments, */ function (err, result) {
       // process results
       // ...
    });

    // just in case:
    a = a.dememoize(); // or: a = mmemoizer.dememoize(a);

## Configuration

Send config object as the last parameter of mmemoize(), use the following options:

- `ttl`: Default key TTL in seconds; default: `120`
- `hashAlgorithm`: Algorithm used for hashing function arguments in memcached keys, set to `null` for no hashing at all, for possible values see [node.js' crypto documentation](http://nodejs.org/docs/latest/api/crypto.html#crypto.createHash); default: `sha1`

## Deployment dependencies
- [node-memcached](https://github.com/3rd-Eden/node-memcached) (of course)

## Tests
- using [mocha](http://visionmedia.github.com/mocha/)
- with running memcached instance (of course)
- `$ mocha`
