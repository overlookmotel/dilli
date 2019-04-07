/* --------------------
 * dilli module
 * Dilli class message perist methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Exports

/*
 * All messages with `persist: true` (the default) are persisted to a journal on disc.
 *
 * User can define this mechanism by defining a `.persist()` method.
 * `.persist()`:
 *   - For each message, is called with:
 *     1. `(messageId, SENDING, message)` when message is being sent
 *     2. `(messageId, DELIVERED)` when message is delivered
 *   - Must write data called with to a file in a way that it can be surely recovered after a crash.
 *   - Must write data in order it is received.
 *
 * If the process crashes, or power is lost, the journal will be re-read and all messages which are
 */

module.exports = {
	_persist(messageId, type, message, options) {
		// If message can be dropped, drop it
		if (!options.persist) return null;

		// Persist message
		// TODO Retry until successful and handle errors
		return this.persist(messageId, type, message, options);
	},

	/**
	 * Persist to message journal.
	 * Can be overridden by user.
	 * @param {number} messageId - Message ID (integer)
	 * @param {Symbol} type - `SENDING` or `DELIVERED`
	 * @param {Object} message - Message object
	 * @param {Object} options - Sending options
	 * @returns {Promise<undefined>}
	 */
	async persist(messageId, type, message, options) {
		// TODO Write this!
		this.log.info('Persisting message', {messageId, type, message, options});
	}
};
