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

});