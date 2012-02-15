var mmemoize = function (memcached, config) {
  var crypto = require('crypto');

  var that = {};

  var configDefaults = {
    ttl: 120,
    hashAlgorithm: 'sha1'
  };
  var cProp;
  for (cProp in configDefaults) {
    if (configDefaults.hasOwnProperty(cProp) && config[cProp] === undefined) {
      config[cProp] = configDefaults[cProp];
    }
  }

  var memoize = function (fct, keyPrefix) {
    if (fct.dememoize !== undefined) { return; } // fct() already memoized
    var unmemoized = fct; // save original function for dememoization purposes

    var mFct = function () {
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
            memcached.set(key, JSON.stringify(fctResult), config.ttl, function (err, result) {
              // NOTE that we *ignore any memcache errors* here!
              if (fctCallback !== undefined) {
                fctCallback.apply(null, fctResult); // call original callback
              }
            });
          });
          fct.apply(null, args); // actually perform function call for memoization
        }
        else { // cache hit:
          mcdResult = JSON.parse(mcdResult);
          if (fctCallback !== undefined) {
            fctCallback.apply(null, mcdResult); // call original callback
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
