# node-mmemoize.js
Memoize asynchronous function calls using memcached

## Usage

    var Memcached = require('memcached'),
        MMemoize = require('mmemoize');

    var memcached = new Memcached('localhost:11211'),
        mmemoize = new MMemoize(memcached, { ttl: 120 }); // in seconds

    function a(b, callback) {
       return callback(null, 'Hooray, ' + b);
    }

    a = mmemoize.memoize(a, 'a');
    a('it works!', function (err, result) {
       console.log(result);
    });

## Deployment dependencies
- [node-memcached](https://github.com/3rd-Eden/node-memcached) (of course)

## Tests
- using [nodeunit](https://github.com/caolan/nodeunit)
- with running memcache instance (of course)

    $ nodeunit tests/tests.js
