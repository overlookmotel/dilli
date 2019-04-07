/* --------------------
 * dilli module
 * Dilli class messaging methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Imports
const {isObject, promiseFirstResolve} = require('./utils'),
	{SENDING, DELIVERED, NOT_DELIVERED} = require('./constants');

// Exports

/*
 * Messages are sent via a queue.
 * Public method to send a message is `.message()`.
 * Internal methods are `._message()` and `._messageAwait()` (used by `Worker#message()`).
 *
 * Messages can be flagged with option `persist: false` if they aren't critical and can be dropped
 * if difficulty delivering them.
 *
 * Messages are both delivered to master server and persisted to disc to aid with crash recovery.
 * See notes in `deliver.js` and `persist.js`.
 */

module.exports = {
	/**
	 * Public `server.message()` method
	 * @param {Object} message - Message object
	 * @param {Object} [options] - Options
	 * @param {boolean} [options.persist=true] - Set to `false` if message should be dropped
	 *   if not connected to the server right now.
	 * @returns {Promise<Object>} - Resolves to `{delivered, persisted, delivering, persisting}`
	 */
	async message(message, options) {
		// Add type field to message
		message = {
			type: message.type || 'message',
			...message
		};

		const {persistPromise, deliveryPromise} = await this._message(message, options);
		const res = await this._messageAwait(persistPromise, deliveryPromise);
		return res;
	},

	/**
	 * Private method to commence sending message.
	 * Returns a Promise containing `messageId` given to the message, and 2 promises which will
	 * resolve when message is delivered or persisted to disc.
	 * Neither promise will ever reject.
	 *
	 * `deliveryPromise` will resolve with `true` when message is delivered, or `false` if sending
	 * it is abandonned (only with `persist: false`).
	 * `deliveryPromise` can also be `null` if delivery is not possible at the moment (connection
	 * to master server is down) (only with `persist: false`).
	 * `persistPromise` will resolve when message persisted to journal on disc.
	 * `persistPromise` will be `null` if `perist: false` as such messages are not persisted to disc.
	 *
	 * When either promise resolves, the caller can be confident the message will be delivered
	 * eventually.
	 *
	 * @private
	 * @param {Object} message - Message object
	 * @param {Object} [options] - Options (optional)
	 * @returns {Promise<Object>} - Resolves to `{messageId, persistPromise, deliveryPromise}`
	 */
	async _message(message, options) {
		options = this._conformMessageOptions(options);

		this.log.info('Sending message', {message, options});

		// Deliver and persist if required
		const messageId = ++this._messageCount;
		const deliveryPromise = this._deliver(messageId, message, options);
		const persistPromise = this._persist(messageId, SENDING, message, options);

		// Once delivery complete, persist "delivered" to journal on disc
		this._persistDeliveryResult(messageId, deliveryPromise, persistPromise, options);

		return {
			messageId,
			deliveryPromise,
			persistPromise
		};
	},

	_conformMessageOptions(options) {
		if (isObject(options) && options.persist === true) return options;

		options = {...options};
		options.persist = options.persist == null ? true : !!options.persist;
		return options;
	},

	_persistDeliveryResult(messageId, deliveryPromise, persistPromise, options) {
		if (!deliveryPromise || !persistPromise) return;

		deliveryPromise.then((delivered) => {
			this._persist(messageId, delivered ? DELIVERED : NOT_DELIVERED, null, options);
		});
	},

	/**
	 * Private method to await until message either delivered or persisted.
	 * Given 2 promises, this awaits until one or other promise resolves,
	 * and returns an object with the status.
	 * If only a promise for delivery is provided, it is awaited alone.
	 * If neither promise is provided, returned promise resolves immediately.
	 *
	 * @private
	 * @param {Promise} [deliveryPromise] - Promise for delivery
	 * @param {Promise} [persistPromise] - Promise for persistence
	 * @returns {Promise<Object>} - Resolves when 1 promise resolves, with status object
	 */
	async _messageAwait(deliveryPromise, persistPromise) {
		let delivered = false,
			persisted = false;

		if (persistPromise || deliveryPromise) {
			if (!deliveryPromise) {
				await persistPromise;
				persisted = true;
			} else {
				const resolvedIndex = await promiseFirstResolve([deliveryPromise, persistPromise]);
				delivered = resolvedIndex === 0;
				persisted = !delivered;
			}
		}

		// Return object describing state
		return {
			delivered,
			persisted,
			delivering: !!deliveryPromise,
			persisting: !!persistPromise
		};
	}
};
