/* --------------------
 * dilli module
 * Dilli class
 * ------------------*/

'use strict';

// Imports
const Message = require('./message'),
	Worker = require('./worker'),
	Job = require('./job'),
	startStopMethods = require('./startStop'),
	{prepareLogger, Logger} = require('./logger'),
	{
		isObject, isFullString, isPositiveInteger, isSemverVersion, isSubclassOf,
		defaultIfNullUndefined, uncapitalize
	} = require('./utils');

// Exports

class Dilli {
	/**
	 * @constructor
	 * @param {Object} options - Options
	 * @param {string|number} options.serverId - Server ID
	 * @param {Object} options.connection - Connection
	 * @param {Object} options.journal - Journal
	 * @param {Object|Function} [options.logger] - Logger
	 */
	constructor(options) {
		if (!options) options = {};

		// Reset
		this._reset();

		// Validate serverId
		const {serverId} = options;
		if (!isFullString(serverId) && !isPositiveInteger(serverId)) throw new Error('serverId option must be a string or positive integer');
		this.serverId = serverId;

		// Logger
		const log = prepareLogger(options.logger);
		this.log = log;

		// Connection
		const {connection} = options;
		if (!isObject(connection)) throw new Error('connection option must be provided');
		this.connection = connection;
		connection.init({
			log: log.child({system: 'connection'})
		});

		// Journal
		const {journal} = options;
		if (!isObject(journal)) throw new Error('journal option must be provided');
		this.journal = journal;
		connection.init({
			log: log.child({system: 'journal'})
		});
	}

	/**
	 * Reset. Called by constructor or when stop is complete.
	 * @returns {undefined}
	 */
	_reset() {
		this.workers = {};
		this.jobs = new Map();

		this._resetStartStop();
	}

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
	}

	_messageWorkersAvailable(workersArr) {
		return this.message({type: 'Workers available', workers: workersArr});
	}

	/**
	 * Send message.
	 * Will seek to send message or write it to journal for sending later.
	 * TODO This is WIP - fix it
	 * @param {Object} payload - Message payload
	 * @param {Object} [options] - Message options
	 * @returns {Message} - Message object
	 */
	message(payload, options) {
		if (!options) options = {};
		const droppable = defaultIfNullUndefined(options.droppable, false);

		if (!isObject(payload)) throw new Error('Payload must be an object');

		// Create message object
		const messageId = this._nextMessageId++;
		const message = new Message(messageId, payload, droppable);

		// If connection not open and message is droppable, drop it
		const {connection} = this;
		if (!connection.isOpen() && droppable) {
			message._dropped();
			return message;
		}

		// Deliver message
		connection.message(message);

		return message;
	}
}

Dilli.Worker = Worker;
Dilli.Job = Job;
Dilli.Logger = Logger;

Object.assign(
	Dilli.prototype,
	startStopMethods
);

module.exports = Dilli;
