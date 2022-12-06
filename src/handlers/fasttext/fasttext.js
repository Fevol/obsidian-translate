/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import fastTextModularized from './fasttext_wasm.js';
import {App, TFile} from "obsidian";
import {settings} from "../../stores";
import {get} from "svelte/store";


var fastTextModule = null

let postRunFunc = null;
const addOnPostRun = function (func) {
	postRunFunc = func;
};



const thisModule = this;
const trainFileInWasmFs = 'train.txt';
const testFileInWasmFs = 'test.txt';
const modelFileInWasmFs = 'model.bin';

const getFloat32ArrayFromHeap = (len) => {
	const dataBytes = len * Float32Array.BYTES_PER_ELEMENT;
	const dataPtr = fastTextModule._malloc(dataBytes);
	const dataHeap = new Uint8Array(fastTextModule.HEAPU8.buffer,
		dataPtr,
		dataBytes);
	return {
		'ptr': dataHeap.byteOffset,
		'size': len,
		'buffer': dataHeap.buffer
	};
};

const heapToFloat32 = (r) => new Float32Array(r.buffer, r.ptr, r.size);

class FastText {
	constructor(plugin) {
		this.plugin = plugin;
	}

	async initialize() {
		fastTextModule = await fastTextModularized();
		if (postRunFunc)
			postRunFunc();
		this.f = new fastTextModule.FastText();
	}

	static async create(plugin) {
		try {
			const o = new FastText(plugin);
			await o.initialize();
			return o;
		} catch (e) {
			return e;
		}
	}



	/**
	 * loadModel
	 * Loads the model file from the specified url, and returns the
	 * corresponding `FastTextModel` object.
	 * @param {string}     url
	 *     the url of the model file.
	 * @return {Promise}   promise object that resolves to a `FastTextModel`
	 */
	async loadModel(url) {
		// var self = this.plugin;
		// let adapter = app.vault.adapter;
		const fastTextNative = this.f;
		try {
			let settings_data = get(settings);
			let bytes = await app.vault.adapter.readBinary(`${app.vault.configDir}/plugins/obsidian-translate/models/fasttext/${url}`);
			const FS = fastTextModule.FS
			FS.writeFile(modelFileInWasmFs, new Uint8Array(bytes));
			fastTextNative.loadModel(modelFileInWasmFs);
			let model = new FastTextModel(fastTextNative);
			return model;
		} catch (e) {
			throw e;
		}
	}
}


class FastTextModel {
	/**
	 * `FastTextModel` represents a trained model.
	 * @constructor
	 * @param {object}       fastTextNative
	 *     webassembly object that makes the bridge between js and C++
	 */
	constructor(fastTextNative) {
		this.f = fastTextNative;
	}

	/**
	 * isQuant
	 * @return {bool}   true if the model is quantized
	 */
	isQuant() {
		return this.f.isQuant;
	}

	/**
	 * getDimension
	 * @return {int}    the dimension (size) of a lookup vector (hidden layer)
	 */
	getDimension() {
		return this.f.args.dim;
	}

	/**
	 * getWordVector
	 * @param {string}          word
	 * @return {Float32Array}   the vector representation of `word`.
	 */
	getWordVector(word) {
		const b = getFloat32ArrayFromHeap(this.getDimension());
		this.f.getWordVector(b, word);

		return heapToFloat32(b);
	}

	/**
	 * getSentenceVector
	 * @param {string}          text
	 * @return {Float32Array}   the vector representation of `text`.
	 */
	getSentenceVector(text) {
		if (text.indexOf('\n') != -1) {
			"sentence vector processes one line at a time (remove '\\n')";
		}
		text += '\n';
		const b = getFloat32ArrayFromHeap(this.getDimension());
		this.f.getSentenceVector(b, text);

		return heapToFloat32(b);
	}

	/**
	 * getNearestNeighbors
	 * returns the nearest `k` neighbors of `word`.
	 * @param {string}          word
	 * @param {int}             k
	 * @return {Array.<Pair.<number, string>>}
	 *     words and their corresponding cosine similarities.
	 */
	getNearestNeighbors(word, k = 10) {
		return this.f.getNN(word, k);
	}

	/**
	 * getAnalogies
	 * returns the nearest `k` neighbors of the operation
	 * `wordA - wordB + wordC`.
	 * @param {string}          wordA
	 * @param {string}          wordB
	 * @param {string}          wordC
	 * @param {int}             k
	 * @return {Array.<Pair.<number, string>>}
	 *     words and their corresponding cosine similarities
	 */
	getAnalogies(wordA, wordB, wordC, k) {
		return this.f.getAnalogies(k, wordA, wordB, wordC);
	}

	/**
	 * getWordId
	 * Given a word, get the word id within the dictionary.
	 * Returns -1 if word is not in the dictionary.
	 * @return {int}    word id
	 */
	getWordId(word) {
		return this.f.getWordId(word);
	}

	/**
	 * getSubwordId
	 * Given a subword, return the index (within input matrix) it hashes to.
	 * @return {int}    subword id
	 */
	getSubwordId(subword) {
		return this.f.getSubwordId(subword);
	}

	/**
	 * getSubwords
	 * returns the subwords and their indicies.
	 * @param {string}          word
	 * @return {Pair.<Array.<string>, Array.<int>>}
	 *     words and their corresponding indicies
	 */
	getSubwords(word) {
		return this.f.getSubwords(word);
	}

	/**
	 * getInputVector
	 * Given an index, get the corresponding vector of the Input Matrix.
	 * @param {int}             ind
	 * @return {Float32Array}   the vector of the `ind`'th index
	 */
	getInputVector(ind) {
		const b = getFloat32ArrayFromHeap(this.getDimension());
		this.f.getInputVector(b, ind);

		return heapToFloat32(b);
	}

	/**
	 * predict
	 * Given a string, get a list of labels and a list of corresponding
	 * probabilities. k controls the number of returned labels.
	 * @param {string}          text
	 * @param {int}             k, the number of predictions to be returned
	 * @param {number}          probability threshold
	 * @return {Array.<Pair.<number, string>>}
	 *     labels and their probabilities
	 */
	predict(text, k = 1, threshold = 0.0) {
		return this.f.predict(text, k, threshold);
	}

	/**
	 * getWords
	 * Get the entire list of words of the dictionary including the frequency
	 * of the individual words. This does not include any subwords. For that
	 * please consult the function get_subwords.
	 * @return {Pair.<Array.<string>, Array.<int>>}
	 *     words and their corresponding frequencies
	 */
	getWords() {
		return this.f.getWords();
	}

	/**
	 * getLabels
	 * Get the entire list of labels of the dictionary including the frequency
	 * of the individual labels.
	 * @return {Pair.<Array.<string>, Array.<int>>}
	 *     labels and their corresponding frequencies
	 */
	getLabels() {
		return this.f.getLabels();
	}

	/**
	 * getLine
	 * Split a line of text into words and labels. Labels must start with
	 * the prefix used to create the model (__label__ by default).
	 * @param {string}          text
	 * @return {Pair.<Array.<string>, Array.<string>>}
	 *     words and labels
	 */
	getLine(text) {
		return this.f.getLine(text);
	}
}


export {FastText, FastTextModel, addOnPostRun};
