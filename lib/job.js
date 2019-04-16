/* --------------------
 * dilli module
 * Job class
 * ------------------*/

'use strict';

// Exports

class Job {
	constructor(jobId, worker, params) {
		this.id = jobId;
		this.worker = worker;
		this.params = {...params};

		this.log = worker.log.child({jobId});
	}
}

module.exports = Job;
