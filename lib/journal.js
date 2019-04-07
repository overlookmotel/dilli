/* --------------------
 * dilli module
 * Journal class
 * ------------------*/

'use strict';

// Modules
const {promiseWait} = require('promise-methods');

// Imports
const {isFullString} = require('./utils');

// Constants
const CONNECTED = Symbol('CONNECTED'),
	CONNECTING = Symbol('CONNECTING'),
	DISCONNECTING = Symbol('DISCONNECTING'),
	DISCONNECTED = Symbol('DISCONNECTED');

// Exports

class Journal {
	constructor(options) {
		if (!options) options = {};
		const {path} = options;
		if (!isFullString(path)) throw new Error('path must be a string');
		this.path = path;

		this.state = DISCONNECTED;
	}

	async open() {
		this.state = CONNECTING;
		await promiseWait(2000);
		this.state = CONNECTED;
	}

	async close() {
		this.state = DISCONNECTING;
		await promiseWait(1000);
		this.state = DISCONNECTED;
	}

	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async write(messageId, type, message) {
		await promiseWait(1000);
		return true;
	}
}

module.exports = Journal;
