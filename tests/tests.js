var Memcached = require('memcached'),
    async = require('async');

var memcached = new Memcached('localhost:11211', { timeout: 100 });

var mmemoize = require('../');
var memoizer = mmemoize(memcached, { ttl: 10 }); // no need for long ttls here


exports['baseline test'] = function (test) {
  test.expect(4 + 1);

  var a = function (callback) {
    test.ok(true, 'Function called');
    callback(null, 2 * 2);
  };

  async.series([
    a, a, a, a
  ], function (err, results) {
    test.deepEqual(results, [4, 4, 4, 4], 'Return values check');
    test.done();
  });
};


exports['(de)memoization cache'] = function (test) {
  test.expect(7);

  var a = function (callback) {
    test.ok(true, 'a called');
    callback(null, 2 * 2);
  };

  var b = function (callback) {
    test.ok(true, 'b called');
    callback(null, 3 * 3);
  };

  var a_m = memoizer.memoize(a, 'a');
  test.notStrictEqual(a_m.dememoize, undefined, 'Dememoization cache ok');
  test.strictEqual(b.dememoize, undefined, 'Dememoization cache not present');

  var b_m = memoizer.memoize(b, 'b');
  test.notStrictEqual(b_m.dememoize, undefined, 'Dememoization cache ok');

  var a_d = memoizer.dememoize(a_m);
  test.strictEqual(a_d.dememoize, undefined, 'Dememoization cache not present');

  var b_d = memoizer.dememoize(b_m);
  test.strictEqual(b_d.dememoize, undefined, 'Dememoization cache not present');

  test.equal(a, a_d, 'Dememoization cache working');
  test.equal(b, b_d, 'Dememoization cache working');

  test.done();
};


exports['memoization'] = function (test) {
  test.expect(1 + 1);

  var a = memoizer.memoize(function (callback) {
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


exports['memoization with custom ttl'] = function (test) {
  test.expect(1 + 1 + 1);

  var a = memoizer.memoize(function (callback) {
    test.ok(true, 'Function called');
    callback(null, 2 * 2);
  }, 'a', 1); // memoize result for 1s only!

  async.series([
    function (callback) {
      memcached.flush(function (err, result) {
        if (err === undefined || err === null || err.length === 0) {
          err = null;
        }
        callback(err, result);
      });
    },
    a, a, // -> 1 test call inside a
    function (callback) {
      setTimeout(callback, 2000, null, true); // wait for 2s
    },
    a, a // -> 1 test call inside a
  ], function (err, results) {
    test.deepEqual(results, [[true], 4, 4, true, 4, 4], 'Return values check');
    test.done();
  });
};


exports['dememoization'] = function (test) {
  test.expect(3 + 2);

  var a = memoizer.memoize(function (callback) {
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
    a, a // -> 1 test call inside a
  ], function (err, results) {
    test.deepEqual(results, [[true], 4, 4], 'Return values check');
    async.series([
      function (callback) {
        a = a.dememoize();
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


exports['memoization key generation'] = function (test) {
  test.expect(2 + 1);

  var a = memoizer.memoize(function (param, callback) {
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


exports['cache hit deserialization'] = function (test) {
  test.expect(1 + 1);

  var a = memoizer.memoize(function (param, callback) {
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
