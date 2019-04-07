/* --------------------
 * dilli module
 * Dilli class message delivery methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Modules
const {defer} = require('promise-methods');

// Imports
const {arrayDelete} = require('./utils');

// Exports

/*
 * User can define own `.deliver()` method to do actual delivery.
 * `.deliver()` must either:
 * 1. Return a promise which:
 *    - resolves to `true` if delivery successful (i.e. receives confirmation
 *      from master it was received)
 *    - resolves to `false` if delivery failed or may have failed
 *    (promise must not reject)
 * 2. Return `null` to indicate can't take more messages right now (back pressure)
 *
 * When a message is requested:
 *   - If currently not connected to server and message marked `mustDeliver: false`, it is dropped
 *   - It is put in delivery queue
 *   - Delivery queue is flushed
 *
 * When delivery queue is flushed:
 *   - `.deliver()` is called on each message in queue.
 *   - If `.deliver()` returns `null`, processing of queue is stopped until a message is delivered,
 *     whereupon processing the queue begins again
 *   - If `.delivery()` returns a promise which resolves to `false`:
 *     - Processing of queue is stopped until *all* messages currently in flight are delivered or
 *       stated as not delivered.
 *
 * `.deliver()` must:
 *   - Not throw
 *   - Not return any promises which reject
 *   - Send each message in the order received
 *   - Acknowledge delivery/non-delivery in the order received
 *   - Not work in such a way that a message fails to deliver and then a later message is delivered
 *     successfully
 *
 * After `.deliver()` has returned `null`, it can indicate it's ready to receive more messages by
 * calling `.deliverReady()`.
 */

module.exports = {
	/*
	 * Init. Called in class constructor.
	 */
	_initDeliver() {
		this._messageQueue = [];
		this._numMessagesSending = 0;
		this._paused = false;
		this._flushing = false;
	},

	_deliver(messageId, message, options) {
		// If not connected and message can be dropped, drop it
		if (!this.connection.isOpen() && !options.mustDeliver) return null;

		// Queue message
		const promise = this._queue(messageId, message, options);
		this._flushQueue();
		return promise;
	},

	_queue(messageId, message, options) {
		// Queue message
		const deferred = defer();

		this._messageQueue.push({
			messageId,
			message,
			options,
			deferred
		});

		this._flushQueue();

		// Return promise for this
		return deferred.promise;
	},

	_flushQueue() {
		if (this._paused) return;

		const queue = this._messageQueue;
		for (let i = this._numMessagesSending; i < queue.length; i++) {
			const item = queue[i];
			const {messageId, message, options} = item;

			this._numMessagesSending++;

			const promise = this.connection.message(messageId, message, options);
			if (!promise) {
				// Delivery says it can't handle more
				// TODO Drop droppable messages?
				this._paused = true;
				break;
			}

			promise.then(
				delivered => this._handleDeliveryResult(item, delivered),
				err => this._handleDeliveryError(err, item)
			);
		}
	},

	_handleDeliveryResult(item, delivered) {
		this._numMessagesSending--;
		const queue = this._messageQueue;

		if (!delivered) {
			// Delivery failure
			// If can drop message, drop it
			// Remove from queue and fullfil delivery promise with `false`
			if (!item.options.mustDeliver) {
				arrayDelete(queue, item);
				item.deferred.resolve(false);
			}

			if (this._numMessagesSending > 0) {
				this._paused = true;
				this._flushing = true;
				return;
			}

			this._flushing = false;
		} else {
			// Delivery succeeded
			if (queue[0] !== item || this._flushing) {
				this._numMessagesSending++;
				this._handleDeliveryError(new Error('Messages delivered out of order'), item);
				return;
			}

			// Remove from queue and fullfil delivery promise with `true`
			queue.shift();
			item.deferred.resolve(true);
		}

		if (this._paused) {
			this._paused = false;
			this._flushQueue();
		}
	},

	_handleDeliveryError(err, item) {
		// TODO deliver this error better - it should cause an exception that terminates process
		// For now, paused + flushing set to prevent any further messages being sent
		this._paused = true;
		this._flushing = true;
		err.item = item;
		throw err;
	},

	// Called by connection when ready for more messages
	// (similar to `drain` event with streams)
	_deliveryDrained() {
		if (this._flushing || !this._paused) return;
		this._paused = false;
		this._flushQueue();
	}
};
