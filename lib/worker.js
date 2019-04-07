/* --------------------
 * dilli module
 * Worker class
 * ------------------*/

'use strict';

// Imports
const {isFunction} = require('./utils'),
	{STOPPED, STARTING, STARTED, STOPPING} = require('./constants');

// Exports

class Worker {
	constructor(jobId, params) {
		this.id = jobId;
		this.params = {...params};

		this.state = STOPPED;
		this.isErrored = false;
		this.error = null;

		const ctor = this.constructor;
		this.server = ctor.server;
		this.log = ctor.log.child({jobId});
	}

	static isWorkerClass(W) {
		return isFunction(W) && !!W.prototype && W.prototype instanceof Worker;
	}

	static async _start() {
		this.state = STARTING;
		this.log.info('Worker starting');

		if (isFunction(this.start)) {
			try {
				await this.start();
			} catch (err) {
				this.isErrored = true;
				this.error = err;
				throw err;
			}
		}

		this.state = STARTED;
		this.log.info('Worker started');
	}

	static async _stop() {
		this.state = STOPPING;
		this.log.info('Worker starting');

		if (isFunction(this.stop)) {
			try {
				await this.stop();
			} catch (err) {
				this.isErrored = true;
				this.error = err;
				throw err;
			}
		}

		this.state = STOPPED;
		this.log.info('Worker stopped');
	}

	async _run() {
		let res;
		try {
			res = await this.run();
			await this.done(res);
		} catch (err) {
			await this.failed(err);
		}
	}

	async run() { // eslint-disable-line class-methods-use-this
		return {};
	}

	async done(res) {
		if (!res) res = {};
		await this._message('success', res);
	}

	async failed(err) {
		if (!err) err = {};

		await this._message('error', {
			message: err.message,
			code: err.code,
			stack: err.stack
		});
	}

	async message(message, options) {
		const res = await this._message('message', message, options);
		return res;
	}

	async _message(type, message, options) {
		const obj = {
			jobId: this.id,
			type,
			message
		};

		const res = await this.server._message(obj, options);
		return res;
	}
}

module.exports = Worker;
