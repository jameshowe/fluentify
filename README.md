# Fluentify
A tiny fluent interface decorator for JavaScript objects.

[![Build Status](https://travis-ci.org/jameshowe/fluentify.svg?branch=master)](https://travis-ci.org/jameshowe/fluentify)

## Install :nut_and_bolt:

```
npm install fluentifyjs
```

## Usage :book:

In simple terms, Fluentify works by allowing you to chain an objects method calls e.g.
```
const fluentify = require('fluentifyjs');

const api = fluentify({
  foo() {},
  bar() {}
});

api
  .foo()
  .bar()
  .done();
```
_"Wait a minute, where did `done` come from?"_ - good question!

### done(err, ...results)

`done` is a function attached to the object by Fluentify and is used to indicate the end of the chain. When each function in the chain is called, rather than being executed, it's added to an internal queue. When `done` is called, Fluentify will purge the queue invoking each function in the correct order, keeping track of any return values.

_Note - if a `done` property already exists on the object it will be overwritten_

Each result is passed to `done` as an explicit parameter as an array. For example, if `foo` and `bar` yield results your `done` call may look like:
```
.done((err, foo, bar) => {
  console.log(foo[0]); // foo result
  console.log(bar[0]); // bar result
});
```
*Tip:bulb: - in scenarios where you have lots of result you can make use of the [spread operator](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator) (ES6 feature) to bundle up your results into an array, or alternatively you can use the [arguments object](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/arguments).*

If an error occurs at any point during the chain, `done` is invoked immediately and any remaining function calls are discarded.

#### Promise support

Prefer a Promise over a callback? Simply omit the callback from your `done` call and Fluentify will return one e.g.
```
const results = await api.foo().bar().done();
```

_"How does Fluentify know what return values to store for each call?"_ - another good question!

### callback(err, result)

For each function in the chain Fluentify expects the final argument to be a callback. The callback works just like any other in JavaScript i.e. passes control back to the caller and yields any results or errors.

For the most part, your callback is going to be the same for each function e.g. `cb => cb(...)`. To avoid having to repeat this boilerplate code in every call, simply omit the callback parameter and Fluentify will inject one for you.

_Note - callback is required even for non-async code, this helps Fluentify retain order regardless of what type of code is being run_

#### Example - implicit callback

```
const fluentify = require('fluentifyjs');

const api = fluentify({
  foo(cb) {
    // do cool stuff
    cb(null, 'foo');
  },
  bar(data, cb) {
    // do more cool stuff
    cb(null, 'bar');
  }
});

api
  .foo()
  .bar('1234')
  .done((err, ...results) => {
    console.log(results[0][0]); // foo
    console.log(results[1][0]); // bar
  });
```
_Notice in the above example we didn't pass a callback to either `foo` or `bar`_

If you do provide a callback, it's important to note that an _additional_ callback inside of this is required in order to pass context back to Fluentify.

#### Example - explicit callback
```
api
  .foo()
  .bar('1234', (err, result, cb) => cb(err, `foo${result}`))
  .done((err, ...results) => {
    console.log(results[0][0]); // foo
    console.log(results[1][0]); // foobar
  });
```
By passing an explicit callback, you [take control away](https://www.youtube.com/watch?v=-dJolYw8tnk) from Fluentify as it can't be sure what's going on in your code, for example, you might make an asynchronous call and need to wait for a reply or just do some stuff synchronously. To remove any doubt, a callback is provided as a means of letting Fluentify know when your done so it can resume processing.

_Note - the additional callback is injected automatically by Fluentify_

### Accessing results

As discussed earlier, Fluentify will keep track of each result and pass them to `done`. However, what if we need access to a particular result earlier than that? With Fluentify, you have two options - FQL or the `results` function.

#### Fluentify Query Language (FQL)

Fluentify has it's own little query language that it uses to bind results to parameters on calls in the chain. An FQL query will always start with `$<index>`

- `$` - prefix used to denote the start of an FQL query
- `<index>` - index of the call whose result we want to bind

For example, let's imagine the first call in your chain fetched a user model which looked like:
```
{
  id: '12345',
  name: 'Bobby Tables',
  email: 'bobby.tables@drop.com'
}
```
Then in the next call, you wanted access to this full result - here's how we'd do that using FQL:
```
const fluentify = require('fluentifyjs');

const api = fluentify({
  get(url, cb) { ... },
  foo(user, cb) { ... }
});

api
  .get('/users/12345')
  .foo('$1')
  .done(...);
```
In the above example, Fluentify will bind the result of the `get` call to the first parameter in the `foo` call.

FQL supports deep indexing into the object tree. For example, lets assume we only need access to the users email in the `foo` call, in that case the FQL would look like `$1.email`, simple!

It also supports indexing into array properties by denoting the index of the item in the array as if it were a property e.g. `$1.list.0`.

_Note - there are no limitations on how deep query into the object tree, however, please bear in mind that there is work involved in parsing & traversing so performance may be impacted_

#### results(resultset, cb)

`results` is a utility function attached to the object by Fluentify and can be used as a way of peeking into underlying result set at a specific point in the chain. It's handled just like any other call in the chain therefore it has a callback and can yield it's own result
```
const fluentify = require('fluentifyjs');

const api = fluentify({
  foo(cb) {
    return cb(null, 'foo');
  },
  bar(cb) {
    return cb(null, 'bar');
  }
});

api
  .foo()
  .bar()
  .results((arr, cb) => cb(null, `${arr[0]}${arr[1]}`))
  .done((err, foo, bar, foobar) => {
    console.log(foo[0]); // foo
    console.log(bar[0]); // bar
    console.log(foobar[0]); // foobar
  });
```
And since it yields it's own result, it means it can be used in conjunction with FQL
```
api
  .foo()
  .bar()
  .results((arr, cb) => cb(null, `${arr[0]}${arr[1]}`))
  .consolidate('$3')
  ...
```
_Note - first parameter of `consolidate` would be `"foobar"`_

And that's all folks! If you have any questions or aren't quite sure about how to use the library please get in touch, I'll be happy to help.

## Bugs :beetle:

As much as us developers hate to admit it, sometimes our code doesn't always work as intended :disappointed: If you happen to find a bug with Fluentify please raise an [issue](https://github.com/jameshowe/fluentify/issues) and I'll do my best to convince you it's by design!

## Contribute :construction:

There are lots of things to like about Fluentify, however, there is always room for improvement. More than happy to accept PRs as long as the change is for the greater good and, of course, includes covering tests.