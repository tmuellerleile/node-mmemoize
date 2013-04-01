var assert = require('assert');

var Memcached = require('memcached'),
    async = require('async');

var memcached = new Memcached('localhost:11211', { timeout: 100, retries: 1, retry: 1 });
var memcachedBroken = new Memcached('localhost:9876', { timeout: 1, retries: 0, retry: 1 });

var mmemoize = require('../');
var memoizer = mmemoize(memcached, { ttl: 10 }); // no need for long ttls here
var memoizerBroken = mmemoize(memcachedBroken, { ttl: 10 }); // no need for long ttls here


suite('Baseline', function () {
  test('function works without memoization', function (done) {
    var a = function (callback) {
      callback(null, 2 * 2);
    };

    async.series([
      a, a, a, a
    ], function (err, result) {
      assert.deepEqual(result, [4, 4, 4, 4]);
      done();
    });
  });
});


suite('(De)memoization cache', function () {
  var a = function (callback) {
    callback(null, 2 * 2);
  };

  var b = function (callback) {
    callback(null, 3 * 3);
  };

  test('is present (only) after memoization', function (done) {
    var a_m = memoizer.memoize(a, 'a');
    assert.notStrictEqual(a_m.dememoize, undefined);
    assert.strictEqual(b.dememoize, undefined);
    var b_m = memoizer.memoize(b, 'b');
    assert.notStrictEqual(b_m.dememoize, undefined);
    done();
  });

  test('actually works', function (done) {
    var a_m = memoizer.memoize(a, 'a');
    var a_d = memoizer.dememoize(a_m);
    assert.strictEqual(a_d.dememoize, undefined);

    var b_m = memoizer.memoize(b, 'b');
    var b_d = memoizer.dememoize(b_m);
    assert.strictEqual(b_d.dememoize, undefined);

    assert.equal(a, a_d);
    assert.equal(b, b_d);

    done();
  });
});


suite('Memoization', function () {
  setup(function (done) {
    memcached.flush(done);
  });

  test('actually works', function (done) {
    var a_calls = 0;

    var a = memoizer.memoize(function (callback) {
      a_calls++;
      callback(null, 2 * 2);
    }, 'a');

    async.series([
      a, a, a, a // -> 1 test call inside a
    ], function (err, result) {
      assert.deepEqual(result, [4, 4, 4, 4]);
      assert.strictEqual(a_calls, 1);
      done();
    });
  });

  test('fails gracefully without working memcached', function (done) {
    var a_calls = 0;

    var a = memoizerBroken.memoize(function (callback) {
      a_calls++;
      callback(null, 2 * 2);
    }, 'a');

    async.series([
      a, a, a, a // -> 4 calls inside a
    ], function (err, result) {
      assert.deepEqual(result, [4, 4, 4, 4]);
      assert.strictEqual(a_calls, 4);
      done();
    });
  });

  test('works with custom ttl', function (done) {
    this.timeout(5000); // longer timeout for ttl test
    var a_calls = 0;

    var a = memoizer.memoize(function (callback) {
      a_calls++;
      callback(null, 2 * 2);
    }, 'a', 1); // memoize result for 1s only!

    async.series([
      a, a, // -> result in 1 call of a
      function (callback) {
        setTimeout(callback, 2000, null, true); // wait for 2s
      },
      a, a // -> result in 1 other call of a
    ], function (err, result) {
      assert.deepEqual(result, [4, 4, true, 4, 4]);
      assert.strictEqual(a_calls, 2);
      done();
    });
  });

  test('creates working signatures/hash keys', function (done) {
    var a_calls = 0;

    var a = memoizer.memoize(function (param, callback) {
      a_calls++;
      callback(null, param * param);
    }, 'a');

    async.series([
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
      assert.deepEqual(results, [4, 4, 9, 9]);
      assert.strictEqual(a_calls, 2);
      done();
    });
  });

  test('works with complex object results', function (done) {
    var a = memoizer.memoize(function (param, callback) {
      callback(null, { 'param': param });
    }, 'a');

    async.series([
      function (callback) {
        a('test', callback);
      },
      function (callback) {
        a('test', callback);
      }
    ], function (err, results) {
      assert.deepEqual(results, [{ 'param': 'test' }, { 'param': 'test' }]);
      done();
    });
  });

  test('maintains context', function (done) {
    var a_calls = 0;

    this.aRandomProperty = 42;

    var a = function (callback) {
      a_calls++;
      callback(null, this.aRandomProperty);
    };
    a = memoizer.memoize(a, 'a');

    async.series([
      a.bind(this), a.bind(this), a.bind(this), a.bind(this) // -> 1 test call inside a
    ], function (err, result) {
      assert.deepEqual(result, [42, 42, 42, 42]);
      assert.strictEqual(a_calls, 1);
      done();
    });
  });
});


suite('Dememoization', function () {
  setup(function (done) {
    memcached.flush(done);
  });

  test('actually works', function (done) {
    var a_calls = 0;

    var a = memoizer.memoize(function (callback) {
      a_calls++;
      callback(null, 2 * 2);
    }, 'a');

    async.series([
      a, a // result in 1 call of a
    ], function (err, result) {
      assert.deepEqual(result, [4, 4]);
      async.series([
        function (callback) {
          a = a.dememoize();
          callback(null, true);
        },
        function (callback) { // -> result in 1 call of a
          a(callback); // we need to wrap these calls for a() inside functions, since otherwise they will be cached in memoized form inside the function series array
        },
        function (callback) {
          a(callback); // and 1 last call of a
        }
      ], function (err, result) {
        assert.deepEqual(result, [true, 4, 4]);
        assert.strictEqual(a_calls, 3)
        done();
      });
    });
  });
});
