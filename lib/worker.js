/* --------------------
 * dilli module
 * Worker class
 * ------------------*/

'use strict';

// Imports
const {isObject} = require('./utils');

// Exports

class Worker {
	constructor(jobId, params) {
		this.id = jobId;
		this.params = {...params};

		const ctor = this.constructor;
		this.server = ctor.server;
		this.log = ctor.log.child({jobId});
	}

	/**
	 * Init worker.
	 * Will only be called once.
	 * @param {Dilli} server - Dilli server instance
	 * @returns {undefined}
	 */
	static init(server) {
		if (!isObject(server)) throw new Error('Server must be provided');
		this.server = server;
		this.error = null;
		this._hasStarted = false;
		this._isStarting = false;
		this._isStarted = false;
		this.log = server.log.child({system: 'workers', worker: this.nameFull});
	}

	/**
	 * Start worker.
	 * Will only be called once.
	 * @returns {Promise<undefined>}
	 */
	static start() {
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
	static stop() {
		this.log('Worker stopping');

		// TODO Write this!
	}

	static hasStarted() {
		return this._hasStarted;
	}

	static isStarted() {
		return this._isStarted;
	}
}

module.exports = Worker;
