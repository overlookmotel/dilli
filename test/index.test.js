/* --------------------
 * dilli module
 * Tests
 * ------------------*/

'use strict';

// Modules
const dilli = require('../index');

// Init
require('./utils');

// Tests

describe('tests', () => {
	it.skip('all', () => { // eslint-disable-line jest/no-disabled-tests
		expect(dilli).not.toBeUndefined();
	});
});
