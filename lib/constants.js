/* --------------------
 * dilli module
 * Constants
 * ------------------*/

'use strict';

// Exports
module.exports = {
	STOPPED: Symbol('STOPPED'),
	STARTING: Symbol('STARTING'),
	STARTED: Symbol('STARTED'),
	STOPPING: Symbol('STOPPING'),
	SENDING: Symbol('SENDING'),
	DELIVERED: Symbol('DELIVERED'),
	NOT_DELIVERED: Symbol('NOT_DELIVERED')
};
