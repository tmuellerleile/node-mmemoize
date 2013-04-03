var mmemoize = function () {
  var crypto = require('crypto');
  var Memcached = require('memcached');
  var memcached;

  var that = {};

  if (arguments.length == 0) {
    throw new Error('No memcached connection string/object given.');
    return null;
  } else if (typeof arguments[0] === 'object' && arguments[0].connect !== undefined) {
    // found a Memcached() instance by duck typing, use it:
    memcached = arguments[0];
  } else if (arguments.length == 1) {
    memached = new Memcached(arguments[0]);
  } else {
    memcached = new Memcached(arguments[0], arguments[1]);
  }

  var configDefaults = {
    ttl: 120,
    hashAlgorithm: 'sha1'
  };

  var config = (arguments.length > 1 && Array.prototype.pop.call(arguments)) || {};

  for (var cProp in configDefaults) {
    if (configDefaults.hasOwnProperty(cProp) && config[cProp] === undefined) {
      config[cProp] = configDefaults[cProp];
    }
  }

  var memoize = function (fct, keyPrefix, ttl) {
    if (fct.dememoize !== undefined) { return; } // fct() already memoized
    var unmemoized = fct; // save original function for dememoization purposes

    if (ttl === undefined) {
      ttl = config.ttl;
    }

    var mFct = function () {
      var _this = this;
      var args = Array.prototype.slice.call(arguments);
      var fctCallback,
          key;
      if (typeof args.slice(-1).pop() === 'function') {
        fctCallback = args.pop(); // cache and remove original callback
      }
      key = calcKey(keyPrefix, args);
      memcached.get(key, function (err, mcdResult) {
        if (err !== undefined || mcdResult === undefined || mcdResult === false) { // memcache error or miss:
          args.push(function () {  // register our new callback:
            var fctResult = Array.prototype.slice.call(arguments);
            memcached.set(key, JSON.stringify(fctResult), ttl, function (err, result) {
              // NOTE that we *ignore any memcache errors* here!
              if (fctCallback !== undefined) {
                fctCallback.apply(_this, fctResult); // call original callback
              }
            });
          });
          fct.apply(_this, args); // actually perform function call for memoization
        }
        else { // cache hit:
          mcdResult = JSON.parse(mcdResult);
          if (fctCallback !== undefined) {
            fctCallback.apply(_this, mcdResult); // call original callback
          }
        }
      });
    };

    var dememoize = function () {
      return unmemoized;
    };
    mFct.dememoize = dememoize;

    return mFct;
  };
  that.memoize = memoize;

  var dememoize = function (fct) { // shamelessly borrowed from https://github.com/caolan/async
    if (fct.dememoize === undefined) { return fct; } // not memoized
    return fct.dememoize();
  };
  that.dememoize = dememoize;

  var getConfig = function () {
    return { ttl: config.ttl, hashAlgorithm: config.hashAlgorithm };
  };
  that.getConfig = getConfig;

  // PRIVATE METHODS:
  var calcKey = function (prefix, args) {
    var key,
        hasher;
    if (typeof args !== 'string') {
      args = JSON.stringify(args);
    }
    if (config.hashAlgorithm !== null) { // hash arguments:
      hasher = crypto.createHash(config.hashAlgorithm);
      hasher.update(args);
      key = prefix + ':' + hasher.digest('hex');
    }
    else {
      key = prefix + ':' + args;
    }
    return key;
  };

  return that;
};
module.exports = mmemoize;
