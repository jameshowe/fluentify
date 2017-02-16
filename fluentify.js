var async = require('async');

function _getLast(arr) {
  // assume array if arr.length (support for arguments)
  return arr && arr.length ? arr[arr.length-1] : null;
}

function _startSession() {
  return {
    _queue: [],
    _results: [],
    _invokeFunc(func, args) {
      if (typeof func === 'function') {
        if (!(args instanceof Array)) {
          args = [args];
        }
        return func.apply(null, args);
      }
    },
    _bindResults(target) {
      for (var i = 0; i < target.length; i++) {
        var arg = target[i];
        // detect result ref parmeters
        if (typeof arg === 'string' && arg.indexOf('$') === 0) {
          var propPath = arg.split('.');
          // extract index
          var indexStr = propPath.shift();
          // no need to -1 on the index, we want to skip the first result
          var index = parseInt(indexStr.substring(1));
          if (!isNaN(index) && index < this._results.length) {
            var argValue = this._results[index];
            // unpack single resultsets
            if (argValue && argValue.length === 1) {
              argValue = argValue[0];
            }
            // traverse result based on path
            for (var x = 0; x < propPath.length; x++) {
              var prop = propPath[x];
              prop = !isNaN(prop) ? parseInt(prop) : prop;
              argValue = argValue[prop];
              if (!argValue) {
                break;
              }
            }
            target[i] = argValue;
          }
        }
      }
    },
    _flush() {
      this._queue = [];
      this._results = [];
    },
    queue(func, args) {
      // insert at the front of the queue
      this._queue.unshift((...prevArgs) => {
        // store results from prev call
        var callback = prevArgs.pop();
        this._results.push(prevArgs);
        // bind result refs from args
        this._bindResults(args);
        var lastArg = _getLast(args);
        if (typeof lastArg === 'function') {
          // override user defined callback to trigger fluent callback
          // with parameters
          args.pop();
          var finalCallback = callback;
          callback = (...newArgs) => {
            newArgs.push(finalCallback);
            lastArg.apply(null, newArgs);
          };
        }
        // inject fluent callback into func params
        args.push(callback);
        this._invokeFunc(func, args);
      });
    },
    results(cb) {
      // take a copy of current results
      var results = this._results.slice();
      // remove initial result which is always null
      results.shift();
      this._invokeFunc(cb, [results]);
    },
    done(cb) {
      async.compose.apply(null, this._queue)(null, (err, ...args) => {
        if (err) {
          setTimeout(() => cb.apply(null, [err]));
        } else {
          // remove initial result which will alway be null
          this._results.shift();
          // store final args
          this._results.push(args);
          // process final callback on next run loop so we can flush the queue
          var results = this._results.slice();
          setTimeout(() => cb.apply(null, [err].concat(results)));
        }
        this._flush();
      });
    }
  };
}

function _fluentWrapper(obj) {
  if (obj.hasOwnProperty('results')) console.warn('[Fluentify] "results" property will be overridden');
  if (obj.hasOwnProperty('done')) console.warn('[Fluentify] "done" property will be overridden');
  var session = _startSession();
  var _wrapFunc = (context, func) => (...args) => {
      session.queue((...args) => func.apply(context, args), args);
      return obj;
    };
  // wrap functions
  for (var prop in obj) {
    var func = obj[prop];
    // exclude non-function / private props
    if (typeof func === 'function' && prop.indexOf('_') !== 0) {
      obj[prop] = _wrapFunc(obj, func);
    }
  }
  obj.results = _wrapFunc(session, session.results);
  obj.done = session.done.bind(session);
  return obj;
}

module.exports = _fluentWrapper;
