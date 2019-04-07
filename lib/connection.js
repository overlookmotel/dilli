/* --------------------
 * dilli module
 * Connection class
 * ------------------*/

'use strict';

// Modules
const {promiseWait} = require('promise-methods');

// Constants
const CONNECTED = Symbol('CONNECTED'),
	CONNECTING = Symbol('CONNECTING'),
	DISCONNECTING = Symbol('DISCONNECTING'),
	DISCONNECTED = Symbol('DISCONNECTED');

// Exports

class Connection {
	constructor(options) {
		this.options = options || {};
		this.server = null;
		this.state = DISCONNECTED;
		this.openCb = null;
		this.closeCb = null;
		this.messageCb = null;
		this.readyCb = null;
	}

	init(server, onOpen, onClose, onMessage, onReady) {
		this.server = server;
		this.openCb = onOpen;
		this.closeCb = onClose;
		this.messageCb = onMessage;
		this.readyCb = onReady;
	}

	async open() {
		this.state = CONNECTING;
		await promiseWait(20);
		this.state = CONNECTED;
	}

	async close() {
		this.state = DISCONNECTING;
		await promiseWait(10);
		this.state = DISCONNECTED;
	}

	message(messageId, message, options) {
		if (this.state !== CONNECTED) return null;
		return this._message(messageId, message, options);
	}

	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async _message(messageId, message, options) {
		await promiseWait(50);
		return true;
	}

	isOpen() {
		return this.state === CONNECTED;
	}
}

module.exports = Connection;
