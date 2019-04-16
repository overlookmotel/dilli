/* --------------------
 * dilli module
 * Dilli class start/stop methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Modules
const {allAwait} = require('promise-methods');

// Imports
const {isObject, isArray, isPositiveIntegerOrZero, promiseTryWrap, forIn} = require('./utils'),
	{NOT_COMMENCED, IN_PROGRESS, DONE, ERRORED} = require('./constants');

// Exports

module.exports = {
	/**
	 * Reset. Called by `._reset()` and constructor.
	 * @returns {undefined}
	 */
	_resetStartStop() {
		this._startStatus = NOT_COMMENCED;
		this._startPromise = null;
		this._stopStatus = NOT_COMMENCED;
		this._stopPromise = null;

		this._sentWorkerNames = false;

		this._nextMessageId = null;

		this._connectionErr = null;
		this._journalErr = null;
	},

	/**
	 * Start server.
	 * If called again while starting, returns same promise.
	 * Promise resolves to `true` when started.
	 * If `.stop()` is called before start up complete, promise resolves to `false`.
	 * If connection fails to open or journal fails to open, promise will reject
	 * and `.stop()` is called.
	 * @returns {Promise<boolean>}
	 */
	start() {
		if (this._stopStatus === IN_PROGRESS) return Promise.reject(new Error('Currently stopping'));

		if (this._startStatus === ERRORED || this._stopStatus === ERRORED) return Promise.reject(new Error('In error state - cannot start'));

		if (this._startStatus === DONE) return Promise.resolve();
		if (this._startStatus === IN_PROGRESS) return this._startPromise;

		const promise = this._start();
		this._startPromise = promise;
		return promise;
	},

	async _start() {
		this._startStatus = IN_PROGRESS;

		const {log} = this;
		log.info('Starting');

		// Open connection + journal
		try {
			const [connectRes, journalRes] = await allAwait(
				this._openConnection(),
				this._openJournal()
			);

			// If `.stop()` called before got here, exit
			if (!connectRes || !journalRes) return false;

			// Send list of cached jobs to master
			this.message({type: 'Jobs cached', jobIds: journalRes.jobIds});

			this._startStatus = DONE;
			log.info('Started');

			return true;
		} catch (err) {
			// Error in start-up - close everything
			this._startStatus = ERRORED;
			log.error('Error starting');

			this.stop().catch(() => {}); // Ignore stopping errors

			throw err;
		} finally {
			this._startPromise = null;
		}
	},

	/**
	 * Open connection.
	 * Promise will reject if connection cannot be opened.
	 * @returns {Promise<boolean>} - `true` if connected
	 */
	async _openConnection() {
		const {log} = this;
		try {
			log.info('Opening connection');

			// Open connection
			const res = await promiseTryWrap(() => this.connection.open());
			if (this._stopStatus !== NOT_COMMENCED) return false;

			if (!isObject(res)) throw new Error(`connection.open() did not return an object - returned ${res}`);

			// Save last message ID
			const {lastMessageId} = res;
			if (!isPositiveIntegerOrZero(lastMessageId)) throw new Error('connection.open() did not return an integer >= 0 as lastMessageId');
			this._nextMessageId = lastMessageId + 1;

			log.info('Opened connection');

			// Send 'Started' message
			this.message({type: 'Started'});

			// Send list of workers
			const {workers} = this;
			this._messageWorkersAvailable(
				Object.keys(workers).map(name => ({name, version: workers[name].version}))
			);
			this._sentWorkerNames = true;

			return true;
		} catch (err) {
			this._connectionErr = err;
			log.error('Error opening connection', {err});
			throw err;
		}
	},

	/**
	 * Open journal.
	 * Promise will reject if journal cannot be opened.
	 * @returns {Promise<Object>} - `null` if not opened
	 */
	async _openJournal() {
		const {log} = this;
		try {
			log.info('Opening journal');

			const res = await promiseTryWrap(() => this.journal.open());
			if (this._stopStatus !== NOT_COMMENCED) return false;

			if (!isObject(res)) throw new Error(`journal.open() did not return an object - returned ${res}`);
			if (!isArray(res.jobIds)) throw new Error('journal.open() did not return jobIds array');

			log.info('Opened journal');

			return res;
		} catch (err) {
			this._journalErr = err;
			log.error('Error opening journal', {err});
			throw err;
		}
	},

	/**
	 * Stop server.
	 * If called again while stopping, returns same promise.
	 * `._stop()` which does actual stopping, will only be called once.
	 * If called before `.start()`, rejects.
	 * @returns {Promise} - Resolves to `undefined` if stops cleanly, rejects if fails
	 */
	stop() {
		if (!this._startStatus === NOT_COMMENCED) return Promise.reject(new Error('Not started yet'));

		if (this._stopStatus === ERRORED) return Promise.reject(new Error('In error state - cannot stop'));

		if (this._stopStatus === DONE) return Promise.resolve();
		if (this._stopStatus === IN_PROGRESS) return this._stopPromise;

		const promise = this._stop();
		this._stopPromise = promise;
		return promise;
	},

	async _stop() {
		this._stopStatus = IN_PROGRESS;

		const {log, connection, journal, workers} = this;
		log.info('Stopping');

		// Close connection
		const closePromises = [];

		log.info('Closing connection');
		closePromises.push(
			promiseTryWrap(() => {
				if (this._connectionErr) throw new Error('Connection errored prior to close');
				return connection.close();
			}).catch((err) => {
				log.error('Error closing connection', {err});
				throw err;
			})
		);

		// Close journal
		log.info('Closing journal');
		closePromises.push(
			promiseTryWrap(() => {
				if (this._journalErr) throw new Error('Journal errored prior to close');
				return journal.close();
			}).catch((err) => {
				log.error('Error closing journal', {err});
				throw err;
			})
		);

		// Stop workers
		forIn(workers, (worker, name) => {
			if (!worker.hasStarted()) return;
			closePromises.push(
				promiseTryWrap(() => {
					if (worker.error) throw new Error('Worker errored prior to stop');
					return worker.stop();
				}).catch((err) => {
					log.error('Error stopping worker', {worker: name, err});
					throw err;
				})
			);
		});

		try {
			await allAwait(closePromises);

			// Await start to complete if it's running
			if (this._startStatus === IN_PROGRESS) await this._startPromise().catch(() => {});

			// Reset so can be started again
			this._reset();
			log.info('Stopped cleanly');
		} catch (err) {
			this._stopStatus = ERRORED;
			log.error('Error stopping', {err});
			throw err;
		} finally {
			this._stopPromise = null;
		}
	}
};
