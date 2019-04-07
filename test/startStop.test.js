/* --------------------
 * dilli module
 * Tests
 * ------------------*/

'use strict';

// Modules
const Dilli = require('../index'),
	{STOPPED, STARTING, STARTED, STOPPING} = Dilli;

// Init
require('./utils');

const spy = jest.fn;

// Tests

describe('startup/shutdown', () => {
	let dilli, log;
	function clearLog() {
		log.length = 0;
	}
	function logger(obj) {
		if (!obj.worker && ['Start requested', 'Starting', 'Started', 'Stop requested', 'Stopping', 'Stopped'].includes(obj.msg)) log.push(obj.msg);
	}

	beforeEach(() => {
		log = [];

		dilli = new Dilli({
			logger,
			connection: new Dilli.Connection()
		});
	});

	describe('start()', () => {
		it('sets state to STARTING', async () => {
			const p = dilli.start();
			expect(dilli.state).toEqual(STARTING);
			await p;
		});

		it('sets state to STARTED after startup complete', async () => {
			await dilli.start();
			expect(dilli.state).toEqual(STARTED);
			expect(log).toEqual(['Start requested', 'Starting', 'Started']);
		});

		it('if already starting, does nothing', async () => {
			await Promise.all([
				dilli.start(),
				dilli.start()
			]);

			expect(dilli.state).toEqual(STARTED);
			expect(log).toEqual(['Start requested', 'Starting', 'Start requested', 'Started']);
		});

		it('if already started, does nothing', async () => {
			await dilli.start();
			await dilli.start();

			expect(dilli.state).toEqual(STARTED);
			expect(log).toEqual(['Start requested', 'Starting', 'Started', 'Start requested']);
		});

		it("if shutdown in progress, awaits it's completion before starting up again", async () => {
			await dilli.start();
			clearLog();

			const stopP = dilli.stop();
			const stopSpy = spy();
			stopP.then(stopSpy);
			stopP.catch(() => {});

			expect(dilli.state).toEqual(STOPPING);

			const startP = dilli.start();
			const startSpy = spy();
			startP.then(startSpy);
			startP.catch(() => {});

			expect(dilli.state).toEqual(STOPPING);

			await stopP;
			expect(dilli.state).toEqual(STARTING);

			await startP;
			expect(dilli.state).toEqual(STARTED);

			expect(stopSpy).toHaveBeenCalledBefore(startSpy);

			expect(log).toEqual(
				['Stop requested', 'Stopping', 'Start requested', 'Stopped', 'Starting', 'Started']
			);
		});
	});

	describe('stop()', () => {
		it('sets state to STOPPING', async () => {
			await dilli.start();
			const p = dilli.stop();
			expect(dilli.state).toEqual(STOPPING);
			await p;
		});

		it('sets state to STOPPED after shutdown complete', async () => {
			await dilli.start();
			await dilli.stop();
			expect(dilli.state).toEqual(STOPPED);
			expect(log).toEqual(
				['Start requested', 'Starting', 'Started', 'Stop requested', 'Stopping', 'Stopped']
			);
		});

		it('if already stopping, does nothing', async () => {
			await dilli.start();
			clearLog();

			await Promise.all([
				dilli.stop(),
				dilli.stop()
			]);

			expect(dilli.state).toEqual(STOPPED);
			expect(log).toEqual(['Stop requested', 'Stopping', 'Stop requested', 'Stopped']);
		});

		it('if already stopped, does nothing', async () => {
			await dilli.start();
			clearLog();

			await dilli.stop();
			await dilli.stop();

			expect(dilli.state).toEqual(STOPPED);
			expect(log).toEqual(['Stop requested', 'Stopping', 'Stopped', 'Stop requested']);
		});

		it("if startup in progress, awaits it's completion before shutting down again", async () => {
			const startP = dilli.start();
			const startSpy = spy();
			startP.then(startSpy);
			startP.catch(() => {});

			const stopP = dilli.stop();
			const stopSpy = spy();
			stopP.then(stopSpy);
			stopP.catch(() => {});

			expect(dilli.state).toEqual(STARTING);

			await startP;
			expect(dilli.state).toEqual(STOPPING);

			await stopP;
			expect(dilli.state).toEqual(STOPPED);

			expect(startSpy).toHaveBeenCalledBefore(stopSpy);

			expect(log).toEqual(
				['Start requested', 'Starting', 'Stop requested', 'Started', 'Stopping', 'Stopped']
			);
		});
	});
});
