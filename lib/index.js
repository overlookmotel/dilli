/* --------------------
 * dilli module
 * ------------------*/

'use strict';

// Imports
const Worker = require('./worker'),
	startStopMethods = require('./startStop'),
	{prepareLogger, Logger} = require('./logger'),
	{isFullString, isSemverVersion} = require('./utils'),
	constants = require('./constants');

// Exports

class Dilli {
	constructor(options) {
		this.options = {...options};
		this.workers = {};
		this.jobs = new Map();
		this.numJobs = 0;
		this._initStartStop();
		this.log = prepareLogger(options.logger);
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

	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async _message(obj, options) {
		// TODO Write this!
	}
}

Object.assign(Dilli.prototype, startStopMethods);
Dilli.Worker = Worker;
Dilli.Logger = Logger;
Object.assign(Dilli, constants);

module.exports = Dilli;
