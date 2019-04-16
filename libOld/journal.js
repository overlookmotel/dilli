/* --------------------
 * dilli module
 * Journal class
 * ------------------*/

'use strict';

// Modules
const pathJoin = require('path').join,
	WriteableStream = require('stream').Writeable,
	fs = require('fs-extra'),
	pump = require('pump'),
	split = require('split'),
	{promisify, promiseWait} = require('promise-methods');

const pumpAsync = promisify(pump);

// Imports
const {isFullString, isNumber, last, arrayDelete, greater, lesser} = require('./utils'),
	{SENDING, DELIVERED, NOT_DELIVERED} = require('./constants');

// Constants
const MIN_FILE_SIZE = 32 * 1024 * 1024, // 32 MB
	MAX_FILE_SIZE = 128 * 1024 * 1024, // 128 MB
	CONNECTED = Symbol('CONNECTED'),
	CONNECTING = Symbol('CONNECTING'),
	DISCONNECTING = Symbol('DISCONNECTING'),
	DISCONNECTED = Symbol('DISCONNECTED'),
	TYPE_STR_SENDING = 'sending',
	TYPE_STR_DELIVERED = 'delivered',
	TYPE_STR_NOT_DELIVERED = 'not delivered';

// Exports

// TODO Add error handling

class Journal {
	constructor(options) {
		// Conform options
		if (!options) options = {};

		const {path} = options;
		if (!isFullString(path)) throw new Error('path must be a string');

		let {minFileSize, maxFileSize} = options;
		if (badFileSizeOption(minFileSize)) throw new Error('minFileSize must be a number');
		if (badFileSizeOption(maxFileSize)) throw new Error('maxFileSize must be a number');
		if (minFileSize != null && maxFileSize != null) {
			if (minFileSize > maxFileSize) throw new Error('maxFileSize must be bigger than minFileSize');
		} else if (minFileSize == null) {
			if (maxFileSize == null) {
				minFileSize = MIN_FILE_SIZE;
				maxFileSize = MAX_FILE_SIZE;
			} else {
				minFileSize = lesser(maxFileSize, MIN_FILE_SIZE);
			}
		} else {
			maxFileSize = greater(minFileSize, MAX_FILE_SIZE);
		}

		// Init object
		this.server = null;
		this.log = null;

		this.state = DISCONNECTED;
		this.dirPath = path;
		this.dirFd = null;

		this.files = [];
		this.currentFile = null;
		this.currentFileSize = null;
		this.nextNum = 0;
		this.openingNextFile = false;
		this.numPendingWrites = 0;
		this.maxFileSize = maxFileSize;
		this.messages = new Map();
	}

	init(server) {
		this.server = server;
		this.log = server.log.child({system: 'journal'});
	}

	async open() {
		this.state = CONNECTING;

		this.log.info('Reading past journals');

		// Open file descriptor for directory
		const {dirPath} = this;
		const dirFd = await fs.open(dirPath, 'r');
		this.dirFd = dirFd;

		// Find files in dir
		let files = await fs.readdir(dirPath);
		files = filesSort(files);

		const firstFile = files[0],
			lastFile = last(files);

		// Delete unneeded files
		if (firstFile && firstFile.ignore) {
			const ignoreUpTo = firstFile.num;

			let numToDelete = 0;
			for (let i = 0; i < files.length; i++) {
				if (files[i].num > ignoreUpTo) {
					numToDelete = i;
					break;
				}
			}

			this.log.debug('Deleting past journals marked ignore', {numToDelete});

			for (let i = numToDelete - 1; i >= 0; i--) {
				const filePath = pathJoin(dirPath, files[i].filename);
				this.log.debug('Deleting past journal', {path: filePath});
				await fs.unlink(filePath);
			}

			this.log.debug('Syncing directory');
			await fs.fdatasync(dirFd);

			this.log.debug('Deleted past journals marked ignore');

			files.splice(0, numToDelete);
		}

		// Create new journal file
		this.nextNum = !firstFile ? 1 : greater(firstFile.num, lastFile.num) + 1;

		await this.createFile();

		// Read past journals
		const {messages} = this;
		let maxMessageId = 0;

		for (const file of files) {
			const readFilePath = pathJoin(dirPath, file.filename);
			file.path = readFilePath;

			const fd = await fs.open(readFilePath, 'a+');
			file.fd = fd;

			const readStream = fs.createReadStream(readFilePath, {encoding: 'utf8'});
			const writeStream = fs.createWriteStream(null, {fd});
			file.readStream = readStream;
			file.writeStream = writeStream;
			file.write = getStreamWriteFn(writeStream);
			file.numOpenMessages = 1; // Fake 1 to prevent file being deleted while still being read
			file.numPendingWrites = 0;
			file.deleting = false;

			this.files.push(file);

			const parseStream = new WriteableStream({
				write(chunk, encoding, cb) { // eslint-disable-line no-loop-func
					const obj = JSON.parse(chunk);
					const {messageId} = obj;
					if (obj.type === TYPE_STR_SENDING) {
						messages.set(messageId, {message: obj.message, file});
						file.numOpenMessages++;
						if (messageId > maxMessageId) maxMessageId = messageId;
					} else {
						messages.delete(messageId);
						file.numOpenMessages--;
					}
					cb();
				}
			});

			await pumpAsync(readStream, split(), parseStream);

			file.readStream = null;
			file.numOpenMessages--;

			this.deleteFileIfFree(file);
		}

		for (const message of messages) {
			this.server.message(message, {persist: false, mustDeliver: true});
		}

		this.state = CONNECTED;

		return maxMessageId;
	}

	async close() {
		this.state = DISCONNECTING;
		await promiseWait(1000);
		this.state = DISCONNECTED;
	}

	async write(messageId, type, message) {
		const {messages} = this;

		let file, typeStr,
			closing = false;
		if (type === SENDING) {
			file = this.currentFile;
			file.numOpenMessages++;
			typeStr = TYPE_STR_SENDING;
			messages.set(messageId, {message, file});
		} else {
			file = messages.get(messageId).file;
			closing = true;

			if (type === DELIVERED) {
				typeStr = TYPE_STR_DELIVERED;
			} else if (type === NOT_DELIVERED) {
				typeStr = TYPE_STR_NOT_DELIVERED;
			} else {
				throw new Error(`Unrecognised journal entry type '${type}'`);
			}
		}

		// Do write
		this.numPendingWrites++;
		file.numPendingWrites++;

		const obj = {messageId, type: typeStr, message};
		const line = `${JSON.stringify(obj)}\n`;
		this.currentFileSize += line.length;

		await file.write(line);
		await fs.fdatasync(file.fd);

		this.numPendingWrites--;
		file.numPendingWrites--;

		if (closing && messages.has(messageId)) {
			messages.delete(messageId);
			file.numOpenMessages--;
		}

		// If file now complete, delete it, or make new file if grown too big
		if (file === this.currentFile) {
			const {currentFileSize} = this;
			if (currentFileSize >= this.maxFileSize) {
				this.createFile();
			} else if (file.numOpenMessages === 0 && currentFileSize >= this.minFileSize) {
				this.createFile();
			}
		} else {
			// Not current file
			await this.deleteFileIfFree(file);
		}

		return true;
	}

	async createFile() {
		if (this.openingNextFile) return null;

		this.openingNextFile = true;

		const num = this.nextNum;
		const filename = `journal${num}.txt`;
		const path = pathJoin(this.dirPath, filename);

		this.log.debug('Opening new journal file', {num, path});

		const file = {
			filename,
			num,
			ignore: false,
			path,
			fd: null,
			readStream: null,
			writeStream: null,
			write: null,
			numOpenMessages: 0,
			numPendingWrites: 0,
			deleting: false
		};

		this.files.push(file);

		// Create file and open
		const fd = await fs.open(path, 'a');
		await fs.fdatasync(fd);
		await fs.fdatasync(this.dirFd);
		const writeStream = fs.createWriteStream(null, {fd});

		file.fd = fd;
		file.writeStream = writeStream;
		file.write = getStreamWriteFn(writeStream);

		// Switch new file to be current
		const previousFile = this.currentFile;
		this.currentFile = file;
		this.currentFileSize = 0;
		this.nextNum++;
		this.openingNextFile = false;

		// Close previous file
		if (previousFile) this.deleteFileIfFree(previousFile);

		return file;
	}

	deleteFileIfFree(file) {
		// NB Only delete if is first file -
		if (file.numOpenMessages > 0 || file !== this.files[0] || file.numPendingWrites > 0) return;
		this.deleteFile(file);
	}

	async deleteFile(file) {
		if (file.deleting) return;
		file.deleting = true;

		const {dirFd} = this;
		const {writeStream, fd} = file;
		file.writeStream = null;
		file.fd = null;

		// Write ignore file
		const ignorePath = `${file.path.slice(0, -4)}.ignore`;
		const ignoreFd = await fs.open(ignorePath, 'w');
		await fs.close(ignoreFd);
		await fs.fdatasync(dirFd);

		// Close file + delete
		await writeStreamEnd(writeStream);
		await fs.close(fd);
		await fs.unlink(file.path);
		await fs.fdatasync(dirFd);

		// Delete ignore file
		// NB No need to flush directory records as it's harmless
		await fs.unlink(ignorePath);

		// Remove from files array
		arrayDelete(this.files, file);

		// Delete next file if now free
		this.deleteFileIfFree(this.files[0]);
	}
}

module.exports = Journal;

const FILENAME_REGEX = /^journal(\d+)\.(txt|ignore)$/;

function filesSort(files) {
	return files.map(name => name.match(FILENAME_REGEX))
		.filter(match => match)
		.map(([filename, num, ext]) => ({filename, num: num * 1, ignore: ext === 'ignore'}))
		.sort(fileSortFn);
}

function fileSortFn(file1, file2) {
	if (file1.ignore) {
		if (!file2.ignore) return -1;
	} else if (file2.ignore) {
		return 1;
	}

	return file1.num > file2.num ? 1 : -1;
}

function getStreamWriteFn(stream) {
	return promisify(stream.write).bind(stream);
}

function writeStreamEnd(stream) {
	return new Promise((resolve, reject) => {
		stream.end(null, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

function badFileSizeOption(size) {
	return size != null && (!isNumber(size) || size < 0);
}
