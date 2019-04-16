/* --------------------
 * dilli module
 * Worker class
 * ------------------*/

'use strict';

// Imports
const {isObject} = require('./utils');

// Exports

class Worker {
	constructor() {
		this.name = null;
		this.server = null;
		this.error = null;
		this._hasStarted = false;
		this._isStarting = false;
		this._isStarted = false;
		this.log = null;
	}

	/**
	 * Init worker.
	 * Will only be called once.
	 * @param {Dilli} server - Dilli server instance
	 * @returns {undefined}
	 */
	init(server) {
		if (!isObject(server)) throw new Error('Server must be provided');
		this.server = server;
		this.log = server.log.child({system: 'workers', worker: this.name});
	}

	/**
	 * Start worker.
	 * Will only be called once.
	 * @returns {Promise<undefined>}
	 */
	start() {
		this.log('Worker starting');

		this._hasStarted = true;
		this._isStarting = true;

		// TODO Write this!
	}

	/**
	 * Start worker.
	 * Will only be called once.
	 * NB May be called before `.start()` has completed.
	 * @returns {Promise<undefined>}
	 */
	stop() {
		this.log('Worker stopping');

		// TODO Write this!
	}

	hasStarted() {
		return this._hasStarted;
	}

	isStarted() {
		return this._isStarted;
	}
}

module.exports = Worker;
