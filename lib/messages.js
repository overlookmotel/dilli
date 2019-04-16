/* --------------------
 * dilli module
 * Dilli class message methods.
 * To be merged into Dilli class prototype.
 * ------------------*/

'use strict';

// Imports
const Message = require('./message'),
	{isObject, defaultIfNullUndefined} = require('./utils');

// Exports

module.exports = {
	/**
	 * Send message.
	 * Will seek to send message or write it to journal for sending later.
	 * TODO This is WIP - fix it
	 * @param {Object} payload - Message payload
	 * @param {Object} [options] - Message options
	 * @returns {Message} - Message object
	 */
	message(payload, options) {
		if (!options) options = {};
		const droppable = defaultIfNullUndefined(options.droppable, false);

		if (!isObject(payload)) throw new Error('Payload must be an object');

		// Create message object
		const messageId = this._nextMessageId++;
		const message = new Message(messageId, payload, droppable);

		// If connection not open and message is droppable, drop it
		const {connection} = this;
		if (!connection.isOpen() && droppable) {
			message._dropped();
			return message;
		}

		// Deliver message
		connection.message(message);

		return message;
	}
};
