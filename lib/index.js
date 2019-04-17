/* --------------------
 * dilli module
 * Entry point.
 * Load Dilli class and add methods + static attributes from other files.
 * ------------------*/

'use strict';

// Imports
const Dilli = require('./dilli'),
	Connection = require('./connection'),
	Journal = require('./journal'),
	Worker = require('./worker'),
	Job = require('./job'),
	{Logger} = require('./logger'),
	startStopMethods = require('./startStop'),
	workerMethods = require('./workers'),
	messageMethods = require('./messages');

// Exports

Dilli.Connection = Connection;
Dilli.Journal = Journal;
Dilli.Worker = Worker;
Dilli.Job = Job;
Dilli.Logger = Logger;

Object.assign(
	Dilli.prototype,
	startStopMethods,
	workerMethods,
	messageMethods
);

module.exports = Dilli;
