/* --------------------
 * dilli module
 * Journal class
 * ------------------*/

'use strict';

// Imports
const {isObject} = require('./utils');

// Exports

class Journal {
	constructor() {
		this.log = null;
		this._isOpen = false;
		this._isAllRead = false;
	}

	/**
	 * Init journal.
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
	 * Open journal.
	 * Will only be called once.
	 * @returns {Promise<Object>} - Resolves to `{jobIds: Array}`
	 */
	async open() { // eslint-disable-line class-methods-use-this
		// TODO Write this!
	}

	/**
	 * Close journal.
	 * Will only be called once.
	 * NB May be called before `.open()` has completed.
	 * @returns {Promise<undefined>}
	 */
	async close() { // eslint-disable-line class-methods-use-this
		// TODO Write this!
	}

	read() { // eslint-disable-line class-methods-use-this
		// TODO Write this!
	}

	isOpen() {
		return this._isOpen;
	}

	isAllRead() {
		return this._isAllRead;
	}
}

module.exports = Journal;
