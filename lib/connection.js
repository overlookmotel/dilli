/* --------------------
 * dilli module
 * Connection class
 * ------------------*/

'use strict';

// Imports
const {isObject} = require('./utils');

// Exports

class Connection {
	constructor() {
		this.log = null;
		this._isOpen = false;
		this._messageQueue = [];
	}

	/**
	 * Init connection.
	 * Will only be called once.
	 * @param {Object} options - Options
	 * @param {Object} options.log - Logger
	 * @returns {undefined}
	 */
	init(options) {
		if (!isObject(options)) throw new Error('options object must be provided');

		if (!isObject(options.log)) throw new Error('options.log object must be provided');
		this.log = options.log;
	}

	/**
	 * Open connection.
	 * Repeatedly try to connect and don't resolve until connection established.
	 * Reject if authentication failure. Otherwise, should not reject.
	 * Will not be called again until `.close()` has completed.
	 * @returns {Promise<Object>} - Resolves to `{lastMessageId: integer}`
	 */
	async open() { // eslint-disable-line class-methods-use-this
		// TODO Write this!
	}

	/**
	 * Close connection.
	 * May be called before `.open()` has completed.
	 * Will not be called again until `.close()` has completed.
	 * @returns {Promise<undefined>}
	 */
	async close() { // eslint-disable-line class-methods-use-this
		// TODO Write this!
	}

	/**
	 * Return `true` if connection is open, `false` if not.
	 * @returns {boolean}
	 */
	isOpen() {
		return this._isOpen;
	}

	/**
	 * Send message
	 * @param {Message} - Message object
	 * @returns {undefined}
	 */
	message(message) {
		// Encode payload
		if (!message.payloadEncoded) message.encode();

		// Queue
		this._messageQueue.push(message);

		// Send message
		// TODO Write this!
		setTimeout(() => { message._delivered(true); }, 1000);
	}
}

module.exports = Connection;
