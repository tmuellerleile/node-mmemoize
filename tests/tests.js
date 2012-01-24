var Memcached = require('memcached'),
    async = require('async');

var memcached = new Memcached('localhost:11211', { timeout: 100 });

var MMemoize = require('../');
var MM = new MMemoize(memcached, { ttl: 10 }); // no need for long ttls here


exports['baseline test'] = function (test) {
  test.expect(4 + 1);

  function a(callback) {
    test.ok(true, 'Function called');
    callback(null, 2 * 2);
  }

  async.series([
    a, a, a, a
  ], function (err, results) {
    test.deepEqual(results, [4, 4, 4, 4], 'Return values check');
    test.done();
  });
};


exports['(de)memoization cache'] = function (test) {
  test.expect(2);

  var a = MM.memoize(function (callback) {
    test.ok(true, 'Function called');
    callback(null, 2 * 2);
  }, 'a');
  test.notStrictEqual(a._unmemoized, undefined, 'Dememoization cache ok');

  a = MM.dememoize(a);
  test.strictEqual(a._unmemoized, undefined, 'Dememoization cache not present');


  test.done();
};


exports['memoization (functional test)'] = function (test) {
  test.expect(1 + 1);

  var a = MM.memoize(function (callback) {
    test.ok(true, 'Function called');
    callback(null, 2 * 2);
  }, 'a');

  async.series([
    function (callback) {
      memcached.flush(function (err, result) {
        if (err === undefined || err === null || err.length === 0) {
          err = null;
        }
        callback(err, result);
      });
    },
    a, a, a, a // -> 1 test call inside a
  ], function (err, results) {
    test.deepEqual(results, [[true], 4, 4, 4, 4], 'Return values check');
    test.done();
  });
};


exports['dememoization (functional test)'] = function (test) {
  test.expect(3 + 2);

  var a = MM.memoize(function (callback) {
    test.ok(true, 'Function called');
    callback(null, 2 * 2);
  }, 'a');

  async.series([
    function (callback) {
      memcached.flush(function (err, result) {
        if (err === undefined || err.length === 0) { // deal with memcached module's weird error handling:
          err = null;
        }
        callback(err, result);
      });
    },
    a, a // -> 1 test call inside a
  ], function (err, results) {
    test.deepEqual(results, [[true], 4, 4], 'Return values check');
    async.series([
      function (callback) {
        a = MM.dememoize(a);
        callback(null, true);
      },
      function (callback) { // -> 2 test calls inside a
        a(callback); // we need to wrap these calls for a() inside functions, since otherwise they will be cached in memoized form inside the function series array
      },
      function (callback) {
        a(callback);
      }
    ], function (err, result) {
      test.deepEqual(results, [[true], 4, 4], 'Return values check');
      test.done();
    });
  });
};


exports['memoization key generation (functional test)'] = function (test) {
  test.expect(2 + 1);

  var a = MM.memoize(function (param, callback) {
    test.ok(true, 'Function called');
    callback(null, param * param);
  }, 'a');

  async.series([
    function (callback) {
      memcached.flush(function (err, result) {
        if (err === undefined || err === null || err.length === 0) {
          err = null;
        }
        callback(err, result);
      });
    },
    function (callback) {
      a(2, callback);
    },
    function (callback) {
      a(2, callback);
    },
    function (callback) {
      a(3, callback);
    },
    function (callback) {
      a(3, callback);
    }
  ], function (err, results) {
    test.deepEqual(results, [[true], 4, 4, 9, 9], 'Return values check');
    test.done();
  });
};


exports['cache hit deserialization (functional test)'] = function (test) {
  test.expect(1 + 1);

  var a = MM.memoize(function (param, callback) {
    test.ok(true, 'Function called');
    callback(null, { 'param': param });
  }, 'a');

  async.series([
    function (callback) {
      memcached.flush(function (err, result) {
        if (err === undefined || err === null || err.length === 0) {
          err = null;
        }
        callback(err, result);
      });
    },
    function (callback) {
      a('test', callback);
    },
    function (callback) {
      a('test', callback);
    }
  ], function (err, results) {
    test.deepEqual(results, [[true], { 'param': 'test' }, { 'param': 'test' }], 'Return values check');
    test.done();
  });
};
