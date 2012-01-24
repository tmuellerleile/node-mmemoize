function MMemoize(memcached, config) {
  this.mcdInstance = memcached;
  this.config = config;
}
module.exports = MMemoize;

MMemoize.prototype = {
  memoize : function(fct, keyPrefix) {
    if (fct._unmemoized !== undefined) { return; } // fct() already memoized
    var mcd = this.mcdInstance;
    var config = this.config;

    var mFct = function() {
      var args = Array.prototype.slice.call(arguments);
      var fctCallback;
      if (typeof(args.slice(-1).pop()) == 'function') {
        fctCallback = args.pop(); // cache and remove original callback
      }
      var key = keyPrefix + ':' + JSON.stringify(args);
      mcd.get(key, function (err, mcdResult) {
        if (err !== undefined || mcdResult === undefined || mcdResult === false) { // memcache error or miss:
          args.push(function () {  // register our new callback:
            var fctResult = Array.prototype.slice.call(arguments);
            mcd.set(key, JSON.stringify(fctResult), config.ttl, function (err, result) {
              // NOTE that we *ignore any memcache errors* here!
              if (fctCallback !== undefined) {
                fctCallback.apply(null, fctResult); // call original callback
              }
            });
          });
          fct.apply(null, args); // actually perform function call for memoization
        }
        else {  // cache hit:
          mcdResult = JSON.parse(mcdResult);
          if (fctCallback !== undefined) {
            fctCallback.apply(null, mcdResult); // call original callback
          }
        }
      });
    };
    mFct._unmemoized = fct; // save original function for dememoization purposes
    return mFct;
  },

  dememoize : function(fct) { // shamelessly borrowed from https://github.com/caolan/async
    if (fct._unmemoized === undefined) { return; } // not memoized
      return fct._unmemoized;
    }
};
