/* --------------------
 * dilli module
 * Utility functions
 * ------------------*/

'use strict';

// Modules
const {promiseTry, isPromise} = require('promise-methods');

// Exports

module.exports = {
	isString,
	isEmptyString,
	isFullString,
	isFunction,
	isObject,
	isArray,
	isBoolean,
	isNumber,
	isInteger,
	isPositiveInteger,
	isPositiveIntegerOrZero,
	isPromise,
	isSubclassOf,
	isSemverVersion,
	last,
	arrayDelete,
	greater,
	lesser,
	capitalize,
	uncapitalize,
	forIn,
	forOf,
	defaultIfNullUndefined,
	wrapError,
	promiseTryWrap,
	promiseFirstResolve
};

function isString(o) {
	return typeof o === 'string';
}

function isEmptyString(o) {
	return o === '';
}

function isFullString(o) {
	return isString(o) && !isEmptyString(o);
}

function isFunction(o) {
	return typeof o === 'function';
}

function isObject(o) {
	return typeof o === 'object' && o !== null && !isArray(o);
}

function isArray(o) {
	return Array.isArray(o);
}

function isBoolean(o) {
	return typeof o === 'boolean';
}

function isNumber(o) {
	return typeof o === 'number';
}

function isInteger(o) {
	return Number.isInteger(o);
}

function isPositiveInteger(o) {
	return isInteger(o) && o > 0;
}

function isPositiveIntegerOrZero(o) {
	return isInteger(o) && o >= 0;
}

function isSubclassOf(o, Klass) {
	return isFunction(o) && !!o.prototype && o.prototype instanceof Klass;
}

function isSemverVersion(version) {
	if (!isString(version)) return false;
	return /^\d+\.\d+\.\d+(?:-\S+)?$/.test(version);
}

function last(arr) {
	return arr[arr.length - 1];
}

function arrayDelete(arr, item) {
	const index = arr.findIndexOf(item);
	if (index === -1) return false;
	arr.splice(index, 1);
	return true;
}

function greater(n1, n2) {
	return n1 > n2 ? n1 : n2;
}

function lesser(n1, n2) {
	return n1 < n2 ? n1 : n2;
}

function capitalize(str) {
	return `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`;
}

function uncapitalize(str) {
	return `${str.slice(0, 1).toLowerCase()}${str.slice(1)}`;
}

function forIn(o, fn) {
	for (const key in o) {
		fn(o[key], key, o);
	}
}

function forOf(o, fn) {
	let key = 0;
	for (const item of o) {
		fn(item, key, o);
		key++;
	}
}

function defaultIfNullUndefined(o, defaultValue) {
	return o != null ? o : defaultValue;
}

function wrapError(err) {
	if (err instanceof Error) return err;

	const wrapped = new Error(`Unknown error: ${err}`);
	wrapped.original = err;
	return wrapped;
}

function promiseTryWrap(fn) {
	return promiseTry(fn).catch((err) => {
		throw wrapError(err);
	});
}

function promiseFirstResolve(arr) {
	return new Promise((resolve) => {
		let resolved = false;
		function resolveDo(index) {
			if (resolved) return;
			resolved = true;
			resolve(index);
		}

		arr.forEach((promise, index) => {
			if (!isPromise(promise)) {
				resolveDo(index);
			} else {
				promise.then(() => resolveDo(index), () => {});
			}
		});
	});
}
