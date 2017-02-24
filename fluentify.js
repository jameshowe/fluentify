// assume array if arr.length (support for arguments)
const _getLast = arr => arr && arr.length ? arr[arr.length-1] : null
const _isNumeric = val => typeof val === 'number' && !Number.isNaN(val);
const _isFunc = func => typeof func === 'function';
const _isRefParam = arg => typeof arg === 'string' && !arg.indexOf('$');

class FluentSession {

  constructor() {
    this._queue = [];
    this._results = [];
  }

  _invokeFunc(func, args) {
    if (!_isFunc(func)) return;
    return func.apply(null, args instanceof Array ? args : [args]);
  }

  _bindResult(arg, i, target) {
    if (!_isRefParam(arg)) return;

    const propPath = arg.split('.');
    // extract index
    const indexStr = propPath.shift();
    let index = Number.parseInt(indexStr.substring(1), 10);

    if (!(_isNumeric(index) && --index < this._results.length)) return;

    let argValue = this._results[index];
    // unpack single resultsets
    if (argValue && argValue.length === 1) {
      argValue = argValue[0];
    }

    // traverse result based on path
    Object.keys(propPath).forEach(k => {
      const prop = _isNumeric(propPath[k]) ? Number.parseInt(propPath[k], 10) : propPath[k];
      argValue = argValue[prop];
      if (!argValue) return;
    });
    target[i] = argValue;
  }

  queue(func, args) {
    this._queue.push(() => new Promise((resolve, reject) => {
      args.forEach(this._bindResult.bind(this));
      let callback = (err, ...results) => err ? reject(err) : resolve(results);
      const lastArg = _getLast(args);
      if (_isFunc(lastArg)) {
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
    const p = new Promise(async (resolve, reject) => {
      try {
        await this._processQueue();
        return resolve(this._results.slice());
      } catch (e) {
        return reject(e);
      }
    });
    if (_isFunc(cb)) {
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
    if (_isFunc(func) && prop.indexOf('_') !== 0) {
      obj[prop] = _wrapFunc(obj, func);
    }
  }
  obj.results = _wrapFunc(session, session.results);
  obj.done = session.done.bind(session);
  return obj;
}

module.exports = fluentify;
