/* --------------------
 * dilli module
 * Dilli class connection management methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Imports
const {STOPPED} = require('./constants');

// Exports

module.exports = {
	/*
	 * Init. Called in class constructor.
	 */
	_initConnection() {
		this.connectState = STOPPED;
	}
};
