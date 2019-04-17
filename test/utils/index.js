/* --------------------
 * dilli
 * Tests utilities
 * ------------------*/

'use strict';

// Modules
const {wait} = require('promise-methods');

// Throw any unhandled promise rejections
process.on('unhandledRejection', (err) => {
	console.log('Unhandled rejection'); // eslint-disable-line no-console
	throw err;
});

// Exports
module.exports = {
	waitTick() {
		return wait(50);
	},

	avoidUnhandledRejection(p) {
		return p.catch(() => {});
	}
};
