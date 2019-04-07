/* --------------------
 * dilli module
 * Utility functions
 * ------------------*/

'use strict';

// Exports

module.exports = {
	isString,
	isEmptyString,
	isFullString,
	isFunction,
	isObject,
	isPromise,
	isSemverVersion,
	wrapError,
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
	return typeof o === 'object' && o !== null;
}

function isPromise(o) {
	return !!o && isFunction(o.then);
}

function isSemverVersion(version) {
	if (!isString(version)) return false;
	return /^\d+\.\d+\.\d+(?:-\S+)?$/.test(version);
}

function wrapError(err) {
	if (err instanceof Error) return err;

	const wrapped = new Error(`Unknown error: ${err}`);
	wrapped.original = err;
	return wrapped;
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
