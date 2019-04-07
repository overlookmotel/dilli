/* --------------------
 * dilli module
 * Logger
 * ------------------*/

'use strict';

// Imports
const {isFunction, isObject, isString} = require('./utils');

// Constants
const METHODS = {
	fatal: 60,
	error: 50,
	warn: 40,
	info: 30,
	debug: 20,
	trace: 10
};

// Exports

/*
 * Logger class
 */
class Logger {
	constructor(fn, parent, fields) {
		this._fn = fn;
		this._parent = parent;
		this._fields = fields;
	}

	static fromFunction(fn) {
		return new Logger(fn);
	}

	static fromObject(obj) {
		// Check has all required methods
		const missingMethods = [];
		for (const name in METHODS) {
			if (!isFunction(obj[name])) missingMethods.push(name);
		}
		if (missingMethods.length > 0) {
			throw new Error(`Logger object missing method${missingMethods.length > 1 ? 's' : ''} ${missingMethods.join(', ')}`);
		}

		return new Logger(null, obj);
	}

	child(fields) {
		return new Logger(null, this, fields);
	}

	_log(name, level, msg, obj) {
		const out = {level, ...this._fields};

		if (isString(msg)) {
			Object.assign(out, obj);
			out.msg = msg;
		} else {
			Object.assign(out, msg);
		}

		const parent = this._parent;
		if (parent) {
			parent[name](out);
		} else {
			const fn = this._fn;
			fn(out);
		}
	}
}

for (const name in METHODS) { // eslint-disable-line guard-for-in
	const level = METHODS[name];
	Logger.prototype[name] = function(...args) {
		this._log(name, level, ...args);
	};
}

/*
 * Convert input logger to Logger class instance
 */
function prepareLogger(logger) {
	if (logger instanceof Logger) return logger;
	if (isFunction(logger)) return Logger.fromFunction(logger);
	if (isObject(logger)) return Logger.fromObject(logger);
	return Logger.fromFunction(() => {});
}

module.exports = {
	prepareLogger,
	Logger
};
