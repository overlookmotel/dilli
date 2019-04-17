/* --------------------
 * dilli module
 * Tests
 * ------------------*/

'use strict';

// Modules
const {defer} = require('promise-methods'),
	Dilli = require('../index');

// Init
const {waitTick, avoidUnhandledRejection} = require('./utils');

const spy = jest.fn;

// Tests

describe('startup/shutdown', () => {
	let dilli, connection, journal,
		connectionOpenDeferred, journalOpenDeferred;

	function connectionOpenResolve() {
		connectionOpenDeferred.resolve({lastMessageId: 0});
	}
	function journalOpenResolve() {
		journalOpenDeferred.resolve({jobIds: []});
	}
	function openResolve() {
		connectionOpenResolve();
		journalOpenResolve();
	}

	beforeEach(() => {
		connection = new Dilli.Connection();
		connection.open = spy(() => {
			connectionOpenDeferred = defer();
			return connectionOpenDeferred.promise;
		});

		journal = new Dilli.Journal();
		journal.open = spy(() => {
			journalOpenDeferred = defer();
			return journalOpenDeferred.promise;
		});

		dilli = new Dilli({serverId: 1, connection, journal});
	});

	describe('start()', () => {
		it('opens connection and journal', async () => {
			const p = dilli.start();
			avoidUnhandledRejection(p);
			expect(connection.open).toHaveBeenCalled();
			expect(journal.open).toHaveBeenCalled();
		});

		it('awaits connection open before resolving', async () => {
			let resolved = false;
			const p = dilli.start().then(() => { resolved = true; });
			avoidUnhandledRejection(p);

			expect(resolved).toBe(false);

			journalOpenResolve();
			await waitTick();
			expect(resolved).toBe(false);

			connectionOpenResolve();
			await waitTick();
			expect(resolved).toBe(true);
		});

		it('awaits journal open before resolving', async () => {
			let resolved = false;
			const p = dilli.start().then(() => { resolved = true; });
			avoidUnhandledRejection(p);

			expect(resolved).toBe(false);

			connectionOpenResolve();
			await waitTick();
			expect(resolved).toBe(false);

			journalOpenResolve();
			await waitTick();
			expect(resolved).toBe(true);
		});

		it('if already starting, does nothing', async () => {
			const p1 = dilli.start();
			const p2 = dilli.start();

			openResolve();
			await Promise.all([p1, p2]);

			expect(connection.open).toHaveBeenCalledTimes(1);
			expect(journal.open).toHaveBeenCalledTimes(1);
		});

		it('if already starting, returns same promise', async () => {
			const p1 = dilli.start();
			const p2 = dilli.start();

			expect(p1).toBe(p2);

			openResolve();
			await Promise.all([p1, p2]);
		});

		it('if already started, does nothing', async () => {
			const p = dilli.start();
			openResolve();
			await p;
			await dilli.start();

			expect(connection.open).toHaveBeenCalledTimes(1);
			expect(journal.open).toHaveBeenCalledTimes(1);
		});

		// TODO Write rest of tests

		/*
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
		*/
	});

	// TODO Write tests for `.stop()`

	/*
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
	*/
});
