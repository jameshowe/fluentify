// assume array if arr.length (support for arguments)
const _getLast = arr => arr && arr.length ? arr[arr.length-1] : null

class FluentSession {

  constructor() {
    this._queue = [];
    this._results = [];
  }

  _invokeFunc(func, args) {
    if (typeof func === 'function') {
      if (!(args instanceof Array)) {
        args = [args];
      }
      return func.apply(null, args);
    }
  }

  _bindResults(target) {
    for (let i = 0; i < target.length; i++) {
      // detect result ref parmeters
      if (typeof arg === 'string' && !arg.indexOf('$')) {
        const propPath = arg.split('.');
        // extract index
        const indexStr = propPath.shift();
        // no need to -1 on the index, we want to skip the first result
        const index = Number.parseInt(indexStr.substring(1), 10);
        if (!Number.isNaN(index) && index < this._results.length) {
          let argValue = this._results[index];
          // unpack single resultsets
          if (argValue && argValue.length === 1) {
            argValue = argValue[0];
          }
          // traverse result based on path
          for (let prop of propPath) {
            prop = !Number.isNaN(prop) ? Number.parseInt(prop) : prop;
            argValue = argValue[prop];
            if (!argValue) {
              break;
            }
          }
          target[i] = argValue;
        }
      }
    }
  }

  queue(func, args) {
    this._queue.push(() => new Promise((resolve, reject) => {
      this._bindResults(args);
      let callback = (err, ...results) => {
        err ? reject(err) : resolve(results);
      };
      const lastArg = _getLast(args);
      if (typeof lastArg === 'function') {
        // override user defined callback to trigger fluent callback
        // with parameters
        args.pop();
        const fluentCallback = callback;
        callback = (...args) => {
          args.push(fluentCallback);
          lastArg.apply(null, args);
        }
      }
      // inject virtual callback into func params
      args.push(callback);
      this._invokeFunc(func, args);
    }));
  }

  async _processQueue() {
    this._results = [];
    for (let p; p = this._queue.shift(); ) {
      this._results.push(await p());
    }
  }

  results(cb) {
    this._invokeFunc(cb, [this._results.slice()]);
  }

  done(cb) {
    let p = new Promise(async (resolve, reject) => {
      try {
        await this._processQueue();
        return resolve(this._results.slice());
      } catch (e) {
        return reject(e);
      }
    });
    if (typeof cb === 'function') {
      p.then(r => cb.apply(null, [null].concat(r))).catch(cb);
    } else {
      return p;
    }
  }
}

const fluentify = obj => {
  if (obj.hasOwnProperty('results')) console.warn('[Fluentify] "results" property will be overridden');
  if (obj.hasOwnProperty('done')) console.warn('[Fluentify] "done" property will be overridden');
  const session = new FluentSession();
  const _wrapFunc = (context, func) => (...args) => {
    session.queue((...args) => func.apply(context, args), args);
    return obj;
  };
  // wrap functions
  for (const prop in obj) {
    const func = obj[prop];
    // exclude non-function / private props
    if (typeof func === 'function' && prop.indexOf('_') !== 0) {
      obj[prop] = _wrapFunc(obj, func);
    }
  }
  obj.results = _wrapFunc(session, session.results);
  obj.done = session.done.bind(session);
  return obj;
}

module.exports = fluentify;
