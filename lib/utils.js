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
	isSemverVersion
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

function isSemverVersion(version) {
	if (!isString(version)) return false;
	return /^\d+\.\d+\.\d+(?:-\S+)?$/.test(version);
}
