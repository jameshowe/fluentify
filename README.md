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

const fluentObj = fluentify({
  foo() {},
  bar() {}
});

fluentObj
  .foo()
  .bar()
  .done();
```
_"Wait a minute, where did `done` come from?"_ - good question!

### done(err, ...results)

`done` is a function automagically attached to the object by Fluentify and is used to indicate the end of the chain. When each function in the chain is called, rather than being executed, it's added to an internal queue. When `done` is called Fluentify effectively "flushes" the queue invoking each function in order and keeping track of any return values.

_Note - if a `done` property already exists on the object it will be overwritten_

Results are bound as explicit parameters per function call with each result being in the form of an array. For example, if `foo` and `bar` yielded results in the example above your `done` call may look something like:
```
.done((err, foo, bar) => {
  console.log(foo[0]); // foo result
  console.log(bar[0]); // bar result
});
```
*Tip:bulb: - in scenarios where you have lots of resultsets you can make use the [spread operator](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator) (ES6 feature) to bundle up your results into an array, or alternatively the [arguments object](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/arguments) which isn't as neat but more widely supported.*

If an error occurs at any point the chain is broken and any remaining functions in the queue are discarded without execution.

_"How does Fluentify know what return values to store for each call?"_ - another good question!

### callback(err, result)

For each function in the chain Fluentify expects the final argument to be a callback. This callback is used to indicate the end of the function and to propogate any related data or error(s).

Given how typical callbacks are in JavaScript, Fluentify has a pretty good idea of what that's going to look like and is more than happy to take care of that boilerplate code for you. In otherwords, if no callback parameter is passed to the call Fluentify will inject a virtual one for you! Neat huh?

#### Example - virtual callback

```
const fluentify = require('fluentifyjs');

const fluentObj = fluentify({
  foo(cb) {
    // do cool stuff
    cb(null, 'foo');
  },
  bar(data, cb) {
    // do more cool stuff
    cb(null, 'bar');
  }
});

fluentObj
  .foo()
  .bar('1234')
  .done((err, ...results) => {
    console.log(results[0][0]); // foo
    console.log(results[1][0]); // bar
  });
```
_Notice in the above example we didn't pass a callback to either `foo` or `bar` calls_

With that being said, sometimes you will want to explicitly pass a callback e.g. maybe you want to do some pre-processing to the return value or dump some logs. Fluentify supports that to!

#### Example - explicit callback
```
fluentObj
  .foo()
  .bar('1234', (err, result, cb) => cb(err, `foo${result}`))
  .done((err, ...results) => {
    console.log(results[0][0]); // foo
    console.log(results[1][0]); // foobar
  });
```
The most important point to note in the above example is the `cb` parameter in our callback. Similar to how Fluentify injects a virtual callback into the calling functions parameters when it doesn't find one, when it _does_ find one it injects a virtual callback into it's parameters instead which you must call to resume processing the queue. 

The reason for this is pretty simple, when you override the callback you [take control away](https://www.youtube.com/watch?v=-dJolYw8tnk) from Fluentify because it can't be sure what's going on in there e.g. you might make an asynchronous call and need to wait for a reply or maybe you just need to do some stuff synchronously - we just don't know! So to remove any doubt, the callback is provided as a means of letting Fluentify know that your _definitely_ done so it can resume processing the remainder of the queue.

### Accessing results

As discussed earlier, Fluentify will keep track of the result for each call in the chain and make them accessible when we call `done`. However, what if we need access to a particular result earlier than that? With Fluentify, we can use either FQL or `results`.

#### Fluentify Query Language (FQL)

Fluentify has it's own little query language that it uses to resolve results to parameters on calls in the chain known as Fluentify Query Language. An FQL query will always start with `$<index>` which is interpreted as:

- `$` - prefix used to denote the start of an FQL query
- `<index>` - index of the result we want to resolve

To demonstrate with an example, let's imagine the first call in your chain was an API call to fetch a user and the result of this call looked something like:
```
{
  id: '12345',
  name: 'Bobby Tables',
  email: 'bobby.tables@drop.com'
}
```
Lets assume in the next call in the chain you wanted access to this full result, using an FQL we can tell Fluentify the resolve the result of the `get` call to the first parameter in the `foo` call
```
const api = {
  get(url, cb) { ... },
  foo(user, cb) { ... }
}
api
  .get('/users/12345')
  .foo('$1')
  .done(...);
```
So this is great if you need the _full_ result, however what if your only interested in part of the result? No problem! FQL supports deep indexing into the object tree e.g. lets assume we only need access to the users email in the `foo` call, in that case our FQL would look like `$1.email`, easy!

FQL also supports indexing into array properties, simply denote the index of the item in the array as if it were a property e.g. say the user had `emails` as opposed to `email` and we wanted to resolve the first one, our FQL would look like `$1.emails.0`.

There are no superficial limitations on how deep you can go, however, it's worth just bearing in mind that there is work involved in parsing & traversing the object tree so be smart about it.

#### results(arr, cb)

FQL works great when working with single results, however, perhaps you want to consolidate multiple results or maybe just want to log what results you've processed at any given point - in step the `results` function. Fluentify attaches this neat little function to the object and, when called, passes the current result collection as a parameter.

`results` has it's own callback which means it can also yield it's own result e.g.
```
api
  .calcWidth()
  .calcHeight()
  .results((arr, cb) => {
    cb(null, {
      width: arr[0][0],
      height: arr[1][0]
    });
  });
  .setArea('$3')
  .done(...);
```
_In the above example, `$3` would resolve to `{ width: ..., height: ... }`_

## Bugs :beetle:

As much as us developers hate to admit it, sometimes our code doesn't always work as intended :disappointed: If you happen to find a bug with `fluentify` please raise an [issue](https://github.com/jameshowe/fluentify/issues) and I'll do my best to convince you it's by design!

## Contribute :construction:

There are lots of things to like about `fluentify`, however, there is always room for improvement. More than happy to accept PRs as long as the change is for the greater good and, of course, includes covering tests.