/* --------------------
 * dilli module
 * Dilli class
 * ------------------*/

'use strict';

// Imports
const {prepareLogger} = require('./logger'),
	{isObject, isFullString, isPositiveInteger} = require('./utils');

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
		this._resetStartStop();
		this._resetWorkers();
	}
}

module.exports = Dilli;
