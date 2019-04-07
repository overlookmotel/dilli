/* --------------------
 * dilli module
 * Worker class
 * ------------------*/

'use strict';

// Imports
const messageMethods = require('./messages'),
	persistMethods = require('./persist'),
	{isFunction, wrapError} = require('./utils'),
	{STOPPED, STARTING, STARTED, STOPPING, SENDING} = require('./constants');

// Exports

class Worker {
	constructor(jobId, params) {
		this.id = jobId;
		this.params = {...params};

		this.state = STOPPED;
		this.error = null;

		const ctor = this.constructor;
		this.server = ctor.server;
		this.log = ctor.log.child({jobId});
	}

	static isWorkerClass(W) {
		return isFunction(W) && !!W.prototype && W.prototype instanceof Worker;
	}

	/*
	 * Start / stop
	 */
	static async _start() {
		if (this.error) throw new Error('Worker in error condition - cannot start');

		this.state = STARTING;
		this.log.info('Worker starting');

		if (isFunction(this.start)) {
			try {
				await this.start();
			} catch (err) {
				throw this._errored(err);
			}
		}

		this.state = STARTED;
		this.log.info('Worker started');
	}

	static async _stop() {
		if (this.error) throw new Error('Worker in error condition - cannot stop');

		this.state = STOPPING;
		this.log.info('Worker starting');

		if (isFunction(this.stop)) {
			try {
				await this.stop();
			} catch (err) {
				throw this._errored(err);
			}
		}

		this.state = STOPPED;
		this.log.info('Worker stopped');
	}

	static _errored(err) {
		err = wrapError(err);
		this.error = err;
		return err;
	}

	/*
	 * Run jobs
	 */
	async _run() {
		this.log.info('Job starting');

		let res;
		try {
			res = await this.run();
			await this.done(res);
		} catch (err) {
			await this.failed(err);
		}

		this.log.info('Job complete');
	}

	async run() { // eslint-disable-line class-methods-use-this
		return {};
	}

	async done(result) {
		this.log.info('Job done', {result});

		if (!result) result = {};
		await this.message({type: 'done', result}, {persist: true});
	}

	async failed(err) {
		this.log.error('Job errored', {err});

		if (!err) err = {};

		await this.message({type: 'error', error: this.formatError(err)}, {persist: true});

		// TODO Handle shutting down server after unexpected error
	}

	formatError(err) { // eslint-disable-line class-methods-use-this
		return {
			message: err.message,
			code: err.code,
			stack: err.stack
		};
	}

	/*
	 * Messaging
	 */
	async message(message, options) {
		options = this._conformMessageOptions(options);

		// Add jobId and type fields to message
		message = {
			jobId: this.id,
			type: message.type || 'message',
			...message
		};

		// Send message
		const {
			messageId, deliveryPromise, persistPromise
		} = await this.server._message(message, options);

		// Local persistance
		let bothPersistPromise = persistPromise;
		if (isFunction(this.persist)) {
			const localPersistPromise = this._persist(messageId, SENDING, message, options);

			// Once delivery complete, persist "delivered" to journal on disc
			this._persistDeliveryResult(messageId, deliveryPromise, localPersistPromise, options);

			bothPersistPromise = Promise.all([persistPromise, localPersistPromise]);
		}

		// Await successful delivery or persistence.
		// If persistence, awaits both main and local persistence.
		const res = await this._messageAwait(deliveryPromise, bothPersistPromise);

		// Return object describing state
		return res;
	}
}

Worker.prototype._conformMessageOptions = messageMethods._conformMessageOptions;
Worker.prototype._messageAwait = messageMethods._messageAwait;
Worker.prototype._persistDeliveryResult = messageMethods._persistDeliveryResult;
Worker.prototype._persist = persistMethods._persist;

module.exports = Worker;
