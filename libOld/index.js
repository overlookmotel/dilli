/* --------------------
 * dilli module
 * ------------------*/

'use strict';

// Imports
const Worker = require('./worker'),
	Connection = require('./connection'),
	Journal = require('./journal'),
	startStopMethods = require('./startStop'),
	messageMethods = require('./messages'),
	deliverMethods = require('./deliver'),
	persistMethods = require('./persist'),
	{prepareLogger, Logger} = require('./logger'),
	{isFullString, isSemverVersion, isObject, isFunction} = require('./utils'),
	constants = require('./constants');

// Constants
const CONNECTION_METHODS = ['init', 'open', 'close', 'message', 'isOpen'],
	JOURNAL_METHODS = ['init', 'open', 'close', 'write'];

// Exports

class Dilli {
	constructor(options) {
		if (!options) options = {};

		this.workers = {};
		this.jobs = new Map();
		this.numJobs = 0;
		this.error = null;

		this._initStartStop();
		this._initMessages();
		this._initDeliver();

		// Logger
		this.log = prepareLogger(options.logger);

		// Connection
		const {connection} = options;
		if (isObject(connection)) {
			throwIfMissingMethods('connection', connection, CONNECTION_METHODS);
		} else {
			throw new Error('connection option must be provided');
		}
		this.connection = connection;

		connection.init(
			this,
			() => {},
			() => {},
			() => {},
			() => this._deliveryDrained
		);

		// Journal
		const {journal} = options;
		if (isObject(journal)) {
			throwIfMissingMethods('journal', journal, JOURNAL_METHODS);
			this.journal = journal;
			journal.init(this);
		} else if (journal == null) {
			this.journal = null;
		} else {
			throw new Error('journal option must be an object if provided');
		}
	}

	addWorker(worker) {
		// Check if worker is valid
		if (!Worker.isWorkerClass(worker)) throw new Error('workers must be subclasses of Worker class');
		const {name} = worker;
		if (!isFullString(name)) throw new Error('Workers must have name defined as a string');
		if (!isSemverVersion(worker.version)) throw new Error('Workers must have version defined as a valid semver version e.g. 2.12.0');

		// Record reference to Dilli instance on worker
		worker.server = this;
		worker.numJobs = 0;
		worker.log = this.log.child({worker: name});

		// Add to workers store
		const {workers} = this;
		if (workers[name]) throw new Error(`A worker with name '${name}' has already been registered`);
		workers[name] = worker;

		worker.log.info('Attached worker');
	}

	async newJob(workerId, jobId, params) {
		if (this.error) throw new Error('Server in error condition - cannot accept job');

		const worker = this.workers[workerId];
		if (!worker) throw new Error(`Worker '${workerId}' not found`);
		if (!jobId) throw new Error('jobId must be provided');

		// Create job
		const job = new worker(jobId, params); // eslint-disable-line new-cap

		// Add job to store
		const {jobs} = this;
		jobs.set(jobId, job);
		this.numJobs++;
		worker.numJobs++;

		// Run job
		await job._run();

		// Remove job from store
		jobs.delete(jobId);
		this.numJobs--;
		worker.numJobs--;
	}
}

Object.assign(
	Dilli.prototype,
	startStopMethods,
	messageMethods,
	deliverMethods,
	persistMethods
);
Dilli.Worker = Worker;
Dilli.Connection = Connection;
Dilli.Journal = Journal;
Dilli.Logger = Logger;
Object.assign(Dilli, constants);

module.exports = Dilli;

/*
 * Helper functions
 */

function throwIfMissingMethods(name, obj, methods) {
	for (const method of methods) {
		if (!isFunction(obj[method])) {
			throw new Error(`${name}.${method} must be a function`);
		}
	}
}
