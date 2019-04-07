/* --------------------
 * dilli module
 * Dilli class start/stop methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Modules
const {promiseForIn, defer} = require('promise-methods');

// Imports
const {wrapError} = require('./utils'),
	{STOPPED, STARTING, STARTED, STOPPING} = require('./constants');

// Exports

/*
 * At any one time, a Dilli instance is in one of 4 states:
 * - Stopped
 * - Started
 * - Starting
 * - Stopping
 *
 * If `.stop()` is called while starting, or `.start()` called while stopping,
 * that next state is queued up to be initiated once the current state change completes.
 *
 * Current state is stored in `.state`.
 * Next state is stored in `._nextState` (or null if no next state)
 * Promise which will resolve when currently transitioning state change completes
 * is stored in `._statePromise`.
 * Deferred which will be resolved when queued state transition completes
 * is stored in `._nextStateDeferred`.
 *
 * So when you call `.start()` the promise returned will only resolve when the state eventually
 * reaches "started", even if it has to stop first. Ditto for calling `.stop()`.
 */

module.exports = {
	_initStartStop() {
		this.state = STOPPED;
		this._statePromise = null;
		this._nextState = null;
		this._nextStateDeferred = null;
	},

	start() {
		this.log.info('Start requested');
		return this._moveToState(STARTED, STARTING, STOPPING, '_start');
	},

	async _start() {
		this.log.info('Starting');
		this.state = STARTING;

		// Open connection
		this.log.info('Opening connection');
		await this.connection.open();

		// Open journal
		if (this.journal) {
			this.log.info('Opening journal');
			await this.journal.open();
		}

		// Start workers
		this.log.info('Starting workers');
		await promiseForIn(this.workers, async (worker) => {
			await worker._start();
		});

		this.log.info('Started');
		this._movedToState(STARTED, '_stop');
	},

	stop() {
		this.log.info('Stop requested');
		return this._moveToState(STOPPED, STOPPING, STARTING, '_stop');
	},

	async _stop() {
		this.log.info('Stopping');
		this.state = STOPPING;

		// Stop workers
		await promiseForIn(this.workers, async (worker) => {
			await worker._stop();
		});

		// Close journal
		if (this.journal) {
			this.log.info('Closing journal');
			await this.journal.close();
		}

		// Close connection
		this.log.info('Closing connection');
		await this.connection.close();

		this.log.info('Stopped');
		this._movedToState(STOPPED, '_start');
	},

	restart() {
		this.log.info('Restart requested');

		if ([STARTING, STOPPED, STOPPING].includes(this.state)) return this.start();

		return Promise.all(
			this.stop(),
			this.start()
		);
	},

	/**
	 * Move to state i.e. start or stop
	 * @param {Symbol} targetState - State want to move to i.e. `STARTED` or `STOPPED`
	 * @param {Symbol} intermediateState - Intermediate state on the way i.e. `STARTING` or `STOPPING`
	 * @param {Symbol} oppositeIntermediateState - Opposite intermediate state
	 *   i.e. `STOPPING` or `STARTING`
	 * @param {string} methodName - Method name to call to reach new state i.e. `'_start'` or `'_stop'`
	 * @returns {Promise<undefined>}
	 */
	async _moveToState(targetState, intermediateState, oppositeIntermediateState, methodName) {
		// If has errored, cannot continue - throw error
		if (this.error) throw new Error('Server in error condition - cannot continue');

		// If already in desired state, exit
		const {state} = this;
		if (state === targetState) return;

		// If already moving to desired state, clear next state and resolve
		if (state === intermediateState) {
			// Clear next state
			if (this._nextState) {
				const deferred = this._nextStateDeferred;
				this._nextState = null;
				this._nextStateDeferred = null;
				deferred.resolve();
			}

			await this._statePromise;
			return;
		}

		// If in process of moving to opposite state, create deferred
		if (state === oppositeIntermediateState) {
			if (this._nextState) {
				// Already queued to move to desired state
				await this._nextStateDeferred.promise;
				return;
			}

			// Schedule to move to opposite state after this move complete
			this._nextState = intermediateState;
			const deferred = defer();
			this._nextStateDeferred = deferred;
			await deferred.promise;
			return;
		}

		// Is in stable opposite state - initiate move
		const promise = this[methodName]();
		this._statePromise = promise;

		try {
			await promise;
		} catch (err) {
			throw this._errored(err);
		}
	},

	/**
	 * State transition complete i.e. started or stopped.
	 * @param {Symbol} state - State reached i.e. `STARTED` or `STOPPED`
	 * @param {string} oppositeMethodName - Method name to call to reach opposite state
	 *   i.e. `'_stop'` or `'_start'`
	 * @returns {undefined}
	 */
	_movedToState(state, oppositeMethodName) {
		// If no next state queued, exit
		if (!this._nextState) {
			this.state = state;
			this.statePromise = null;
			return;
		}

		// There is a queued up transition to opposite state.
		// Initiate move.
		const deferred = this._nextStateDeferred;
		this._nextState = null;
		this._nextStateDeferred = null;

		const promise = this[oppositeMethodName]();
		this._statePromise = promise;
		deferred.resolve(promise);
	},

	/**
	 * Record error
	 */
	_errored(err) {
		err = wrapError(err);
		this.error = err;
		return err;
	}
};
