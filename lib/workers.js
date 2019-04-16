/* --------------------
 * dilli module
 * Dilli class worker methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Imports
const Worker = require('./worker'),
	{isFullString, isSemverVersion, isSubclassOf, uncapitalize} = require('./utils');

// Exports

module.exports = {
	/**
	 * Reset. Called by `._reset()` and constructor.
	 * @returns {undefined}
	 */
	_resetWorkers() {
		this.workers = {};
		this.jobs = new Map();
	},

	/**
	 * Attach worker to server.
	 * @param {Object} - Worker class
	 * @returns {Dilli} - `this` for chaining
	 */
	attachWorker(worker) {
		// Check if worker is valid
		if (worker == null) throw new Error('Worker object must be provided');

		let WorkerClass;
		if (worker instanceof Worker) {
			WorkerClass = worker.constructor;
		} else {
			if (!isSubclassOf(worker, Worker)) throw new Error('.attachWorker must be passed an instance of or subclass of Dilli.Worker class');
			WorkerClass = worker;
			worker = new WorkerClass();
		}

		let {name, version} = worker;
		if (name == null) {
			name = WorkerClass.name;
			if (!isFullString(name)) throw new Error('worker.name or Worker.name must be a string');
			name = uncapitalize(name);
			worker.name = name;
		} else if (!isFullString(name)) {
			throw new Error('worker.name must be a string if defined');
		}

		if (version == null) version = WorkerClass.version;

		if (!isSemverVersion(version)) throw new Error('worker.version or Worker.version must be a valid semver version e.g. 2.12.0');
		worker.version = version;

		// Add to workers store
		const {workers} = this;
		if (workers[name]) throw new Error(`A worker with name '${name}' has already been registered`);
		workers[name] = worker;

		// Init worker
		worker.init(this);

		// If worker added after start-up, send message to master saying worker available
		if (this._sentWorkerNames) this._messageWorkersAvailable([{name, version}]);

		worker.log.info('Attached worker');
		return this;
	},

	_messageWorkersAvailable(workersArr) {
		return this.message({type: 'Workers available', workers: workersArr});
	}
};
