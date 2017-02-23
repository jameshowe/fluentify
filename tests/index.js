const fluentify = require('../fluentify');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('Fluentify API', () => {

	it('does not decorate underscore properties', () => {
		const obj = {
			_one: 1,
			_two: '2',
			_three: [3],
			_four() { },
			_five: {}
		};
		const fluentObj = fluentify(obj);
		expect(fluentObj._one).to.equal(1);
		expect(fluentObj._two).to.equal('2')
		expect(fluentObj._three).to.eql([3]);
		expect(fluentObj._four.toString()).to.equal(obj._four.toString());
		expect(fluentObj._five).to.eql({});
	});

	it('does not decorate non-function properties', () => {
		const obj = {
			one: 1,
			two: '2',
			three: [3],
			four: {}
		};
		const sixBefore = obj.six;
		const fluentObj = fluentify(obj);
		expect(fluentObj.one).to.equal(1);
		expect(fluentObj.two).to.equal('2');
		expect(fluentObj.three).to.eql([3]);
		expect(fluentObj.four).to.eql({});
	});

	it('decorates non-underscore function properties', () => {
		const obj = {
			one: 1,
			two() { },
			three: [3],
			four() { },
			five: {}
		};
		const twoBefore = obj.two;
		const fourBefore = obj.four;
		const fluentObj = fluentify(obj);
		expect(fluentObj.one).to.equal(1);
		expect(fluentObj.two.toString()).to.not.equal(twoBefore.toString());
		expect(fluentObj.two).to.be.a('function');
		expect(fluentObj.three).to.eql([3]);
		expect(fluentObj.four.toString()).to.not.equal(fourBefore.toString());
		expect(fluentObj.four).to.be.a('function');
		expect(fluentObj.five).to.eql({});
	});

	it('returns wrapped instance', () => {
		const obj = {
			one() { }
		};
		const fluentObj = fluentify(obj);
		expect(obj).to.equal(fluentObj);
	})

	it('overrides "done" property', () => {
		const obj = {
			done: 1
		};
		const mock = sinon.mock(console);
		mock.expects('warn').withExactArgs('[Fluentify] "done" property will be overridden');
		fluentify(obj);
		expect(obj.done).to.be.a('function');
		mock.verify();
	});

	it('overrides "results" property', () => {
		const obj = {
			results: {}
		};
		const mock = sinon.mock(console);
		mock.expects('warn').withExactArgs('[Fluentify] "results" property will be overridden');
		fluentify(obj);
		expect(obj.results).to.be.a('function');
		mock.verify();
	});

	it('attaches "done" function to instance', () => {
		const obj = {};
		fluentify(obj);
		expect(obj.done).to.be.a('function');
	});

	it('attaches "results" function to instance', () => {
		const obj = {};
		fluentify(obj);
		expect(obj.results).to.be.a('function');
	});

	describe('#done', () => {

		const obj = fluentify({
			fooCalls: 0,
			foo(delay, cb) {
				++this.fooCalls;
				return delay ? setTimeout(() => cb(null, this.fooCalls), delay) : cb(null, this.fooCalls);
			}
		});

		beforeEach(() => {
			obj.fooCalls = 0;
		});
		it('returns undefined when callback defined', () => {
			expect(obj.done(() => {})).to.not.exist;
		})
		it('triggers callback when final call in the chain completes', done => {
			obj.foo(0).foo(500).foo(1000).foo(0).done(err => {
				expect(err, err).to.not.exist;
				expect(obj.fooCalls).to.equal(4);
				done();
			});
		});
		it('binds results as callback parameters', done => {
			obj.foo(0).foo(500).foo(1000).done((err, ...results) => {
				expect(err, err).to.not.exist;
				expect(results).to.eql([[1], [2], [3]]);
				done();
			});
		});
		it('returns Promise when no callback defined', () => {
			expect(obj.done()).to.be.a('Promise');
		});
		it('resolves when final call in chain completes', async () => {
			await obj.foo(0).foo(1000).foo(500).foo(0).done();
			expect(obj.fooCalls).to.equal(4);
		});
		it('resolves with results', async () => {
			const results = await obj.foo(0).foo(1000).foo(500).done();
			expect(results).to.eql([[1], [2], [3]]);
		});
	});

	describe('FQL', () => {

		it('binds full result to parameter', async () => {
			const obj = fluentify({
				inc(value, cb) {
					return cb(null, value + 1);
				}
			});
			const results = await obj
				.inc(9)
				.inc('$1')
				.inc('$2')
				.inc('$3')
				.done();
			expect(results).to.eql([[10], [11], [12], [13]])
		});

		it('binds result property to parameter', async () => {
			const api = fluentify({
				init(cb) {
					return cb(null, {
						path: '0',
						child: {
							path: '0.0',
							child: {
								path: '0.0.0'
							}
						}
					});
				},
				foo(val, cb) {
					return cb(null, val);
				}
			});

			const results = await api
				.init()
				.foo('$1.path')
				.foo('$1.child.path')
				.foo('$1.child.child.path')
				.done();
			expect(results[1][0]).to.equal('0');
			expect(results[2][0]).to.equal('0.0');
			expect(results[3][0]).to.equal('0.0.0');
		});

		it('binds result array property to parameter', async () => {
			const api = fluentify({
				init(cb) {
					return cb(null, {
						children: ['0', {
							children: ['0.0', {
								children: ['0.0.0']
							}]
						}]
					});
				},
				foo(val, cb) {
					return cb(null, val);
				}
			});

			const results = await api
				.init()
				.foo('$1.children.0')
				.foo('$1.children.1.children.0')
				.foo('$1.children.1.children.1.children.0')
				.done();
			expect(results[1][0]).to.equal('0');
			expect(results[2][0]).to.equal('0.0');
			expect(results[3][0]).to.equal('0.0.0');
		});
	})

});