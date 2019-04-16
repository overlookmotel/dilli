/* --------------------
 * dilli module
 * Message class
 * ------------------*/

'use strict';

// Modules
const {defer} = require('promise-methods');

// Exports

class Message {
	constructor(messageId, payload, droppable) {
		this.messageId = messageId;
		this.payload = payload;
		this.payloadEncoded = null;
		this.isDroppable = droppable;

		this.willDeliver = droppable ? null : true;
		this.isDelivered = false;
		this.isDropped = false;
		this._deliveredDeferred = null;
	}

	encode() {
		if (this.payloadEncoded) return;
		this.payloadEncoded = JSON.stringify(this.payload);
		this.payload = null;
	}

	/**
	 * Return a promise when delivered
	 * @returns {Promise} - Resolves to `true` if delivered, `false` if dropped
	 */
	whenDelivered() {
		if (this.isDelivered) return Promise.resolve(true);
		if (this.isDropped) return Promise.resolve(false);

		let deferred = this._deliveredDeferred;
		if (!deferred) {
			deferred = defer();
			this._deliveredDeferred = deferred;
		}

		return this._deliveredDeferred.promise;
	}

	_delivered() {
		this.willDeliver = true;
		this.isDelivered = true;
		this._resolveDelivered(true);
	}

	_dropped() {
		this.willDeliver = false;
		this.isDropped = true;
		this._resolveDelivered(false);
	}

	_resolveDelivered(value) {
		const deferred = this._deliveredDeferred;
		if (deferred) {
			this._deliveredDeferred = null;
			deferred.resolve(value);
		}
	}
}

module.exports = Message;
