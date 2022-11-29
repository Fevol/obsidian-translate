/* eslint-disable no-global-assign */
/* eslint-disable no-native-reassign */
/* eslint-disable max-lines */

/* global loadEmscriptenGlueCode, Queue, serializeError, importScripts */
import {loadEmscriptenGlueCode} from "./bergamot-translator-worker";


let engineWasmLocalPath;


/*
 * this class should only be instantiated the web worker
 * to serve as a helper and placeholder for the translation related
 * objects like the underlying wasm module, the language models etc... and
 * their states of operation
 */
class Bergamot {
	available_models = {};
	path = "";


	constructor(available_models = {}, path) {
		this.available_models = available_models;
		this.path = path;

		// all variables specific to translation service
		this.translationService = null;

		// a map of language-pair to TranslationModel object
		this.translationModels = new Map();
		this.WasmEngineModule = null;
		this.PIVOT_LANGUAGE = "en";

		// alignment for each file type, file type strings should be same as in the model registry
		this.modelFileAlignments = {
			"model": 256,
			"lex": 64,
			"vocab": 64,
			"qualityModel": 64,
			"srcvocab": 64,
			"trgvocab": 64,
		}
	}


	async loadTranslationEngine() {
		let path = `.obsidian/${this.path}/bergamot/bergamot-translator-worker.wasm`;

		if (!await app.vault.adapter.exists(path))
			throw 'Could not find bergamot-translator-worker.wasm in the vault';

		let wasmArrayBuffer = await app.vault.adapter.readBinary(path)

		const initialModule = {
			preRun: [ ],
			onAbort() {
				console.log("Error loading wasm module.");
			},
			onRuntimeInitialized: function() {
				this.constructTranslationService();
			}.bind(this),
			wasmBinary: wasmArrayBuffer,
		};
		try {
			this.WasmEngineModule = loadEmscriptenGlueCode(initialModule);
		} catch (e) {
			console.log("Error loading wasm module:", e);
		}
	}

	// instantiate the Translation Service
	constructTranslationService() {
		if (!this.translationService) {
			// caching is disabled (see https://github.com/mozilla/firefox-translations/issues/288)
			// Caching can be re-enabled by setting nr > 0, check if necessary
			let translationServiceConfig = { cacheSize: 0 };
			this.translationService = new this.WasmEngineModule.BlockingService(translationServiceConfig);
		}
	}


	async translate (text, from, to) {
		// TODO: find out what 'messages' is
		let vectorResponse, vectorResponseOptions, vectorSourceText;
		try {
			// vectorResponseOptions = this._prepareResponseOptions(messages);
			// vectorSourceText = this._prepareSourceText(messages);
			const vectorResponseOptions = new this.WasmEngineModule.VectorResponseOptions();
			vectorResponseOptions.push_back({
				qualityScores: true,
				alignment: true,
				html: false,
			});


			vectorSourceText = new this.WasmEngineModule.VectorString();
			vectorSourceText.push_back(text);

			if (this._isPivotingRequired(from, to)) {
				// translate via pivoting
				const from_model = await this.getTranslationModel(from, this.PIVOT_LANGUAGE);
				const to_model = await this.getTranslationModel(this.PIVOT_LANGUAGE, to);
				vectorResponse = this.translationService.translateViaPivoting(from_model, to_model, vectorSourceText, vectorResponseOptions);
			} else {
				// translate without pivoting
				const model = await this.getTranslationModel(from, to);
				vectorResponse = this.translationService.translate(model, vectorSourceText, vectorResponseOptions);
			}

			// parse all relevant information from vectorResponse
			return this._parseTranslatedText(vectorResponse);
		} catch (e) {
			console.error("Error in translation engine ", e)
			throw e;
		} finally {
			// necessary clean up
			if (typeof vectorSourceText !== "undefined") vectorSourceText.delete();
			if (typeof vectorResponseOptions !== "undefined") vectorResponseOptions.delete();
			if (typeof vectorResponse !== "undefined") vectorResponse.delete();
		}
	}

	async getTranslationModel(from, to) {
		const languagePair = this._getLanguagePair(from, to);

		if (this.translationModels.has(languagePair)) {
			return this.translationModels.get(languagePair);
		} else {
			const target_language = from === 'en' ? to : from;
			const is_from = from === target_language;

			let model = this.available_models.models.find((x) => x.locale === target_language);

			if (!model)
				throw "Model was not found"

			let data = model.files.filter((x) => x.usage === 'both' || x.usage === (is_from ? "from" : "to"));

			let quality_model = data.find((x) => x.name.startsWith("qualityModel"));
			let language_model = data.find((x) => x.name.startsWith("model"));

			// TODO: What is quality estimation and where is it used?
			let has_quality_estimation = quality_model !== null;

			// Taken from firefox-translations/backgroundScript.js/GetLanguageModels
			let precision = language_model.name.endsWith("intgemm8.bin") ? "int8shiftAll" : "int8shiftAlphaAll";


			/*
			 * for available configuration options,
			 * please check: https://marian-nmt.github.io/docs/cmd/marian-decoder/
			 * DO NOT CHANGE THE SPACES BETWEEN EACH ENTRY OF CONFIG
			 */
			const modelConfig = `
            beam-size: 1
            normalize: 1.0
            word-penalty: 0
            max-length-break: 128
            mini-batch-words: 1024
            workspace: 128
            max-length-factor: 2.0
            skip-cost: ${!has_quality_estimation}
            cpu-threads: 0
            quiet: true
            quiet-translation: true
            gemm-precision: ${precision}
            alignment: soft
            `;

			let lex_model = data.find((x) => x.name.startsWith("lex"));
			let vocab_model = data.find((x) => x.name.startsWith("vocab"));

			const alignedModelMemory = await this.loadBinary(target_language, language_model.name, 'model');
			const alignedShortlistMemory = await this.loadBinary(target_language, lex_model.name, 'lex');
			let alignedVocabMemoryList = new this.WasmEngineModule.AlignedMemoryList();
			if (vocab_model)
				alignedVocabMemoryList.push_back(await this.loadBinary(target_language, vocab_model.name, 'vocab'));
			else {
				let src_vocab_model = data.find((x) => x.name.startsWith("srcvocab"));
				let trg_vocab_model = data.find((x) => x.name.startsWith("trgvocab"));

				alignedVocabMemoryList.push_back(await this.loadBinary(target_language, src_vocab_model.name, 'srcvocab'));
				alignedVocabMemoryList.push_back(await this.loadBinary(target_language, trg_vocab_model.name, 'trgvocab'));
			}

			let alignedQEMemory = null;
			if (quality_model) {
				alignedQEMemory = await this.loadBinary(target_language, quality_model.name, 'qualityModel');
			}

			// Merge all data and generate Model
			let translationModel = new this.WasmEngineModule.TranslationModel(modelConfig, alignedModelMemory, alignedShortlistMemory, alignedVocabMemoryList, alignedQEMemory);
			this.translationModels.set(languagePair, translationModel);
			return translationModel;
		}
	}

	async loadBinary(language, filename, type) {
		return app.vault.adapter.readBinary(`.obsidian/${this.path}/bergamot/${language}/${filename}`).then(file => {
			return this.prepareAlignedMemoryFromBuffer(file, this.modelFileAlignments[type]);
		})
	}


	get ENGINE_STATE () {
		return {
			LOAD_PENDING: 0,
			LOADING: 1,
			LOADED: 2
		};
	}
	
	deleteModels() {
		// delete all previously constructed translation models and clear the map
		this.translationModels.forEach((value, key) => {
			console.log(`Destructing model '${key}'`);
			value.delete();
		});
		this.translationModels.clear();
	}
	
	_isPivotingRequired(from, to) {
		return from !== this.PIVOT_LANGUAGE && to !== this.PIVOT_LANGUAGE;
	}

	_getLanguagePair(from, to) {
		return `${from}${to}`;
	}

	// this function constructs and initializes the AlignedMemory from the array buffer and alignment size
	prepareAlignedMemoryFromBuffer (buffer, alignmentSize) {
		let byteArray = new Int8Array(buffer);
		let alignedMemory = new this.WasmEngineModule.AlignedMemory(byteArray.byteLength, alignmentSize);
		const alignedByteArrayView = alignedMemory.getByteArrayView();
		alignedByteArrayView.set(byteArray);
		return alignedMemory;
	}
	
	// _getLoadedTranslationModel(from, to) {
	// 	const languagePair = this._getLanguagePair(from, to);
	// 	if (!this.translationModels.has(languagePair)) {
	// 		throw Error(`Translation model '${languagePair}' not loaded`);
	// 	}
	// 	return this.translationModels.get(languagePair);
	// }

	_prepareResponseOptions(messages) {
		const vectorResponseOptions = new this.WasmEngineModule.VectorResponseOptions();
		messages.forEach(message => {
			vectorResponseOptions.push_back({
				qualityScores: message.withQualityEstimation,
				alignment: true,
				html: message.isHTML,
			});
		});
		if (vectorResponseOptions.size() === 0) {
			vectorResponseOptions.delete();
			throw Error("No Translation Options provided");
		}
		return vectorResponseOptions;
	}

	_prepareSourceText(messages) {
		let vectorSourceText = new this.WasmEngineModule.VectorString();
		messages.forEach(message => {
			const sourceParagraph = message.sourceParagraph;
			// prevent empty paragraph - it breaks the translation
			if (sourceParagraph.trim() === "") return;
			vectorSourceText.push_back(sourceParagraph);
		})
		if (vectorSourceText.size() === 0) {
			vectorSourceText.delete();
			throw Error("No text provided to translate");
		}
		return vectorSourceText;
	}

	_parseTranslatedText(vectorResponse) {
		const result = [];
		for (let i = 0; i < vectorResponse.size(); i+=1) {
			const response = vectorResponse.get(i);
			result.push(response.getTranslatedText());
		}
		return result.join('\n');
	}

	// this function extracts all the translated sentences from the Response and returns them.
	// getAllTranslatedSentencesOfParagraph (response) {
	// 	const sentences = [];
	// 	const text = response.getTranslatedText();
	// 	for (let sentenceIndex = 0; sentenceIndex < response.size(); sentenceIndex+=1) {
	// 		const utf8SentenceByteRange = response.getTranslatedSentence(sentenceIndex);
	// 		sentences.push(this._getSentenceFromByteRange(text, utf8SentenceByteRange));
	// 	}
	// 	return sentences;
	// }

	// this function extracts all the source sentences from the Response and returns them.
	// getAllSourceSentencesOfParagraph (response) {
	// 	const sentences = [];
	// 	const text = response.getOriginalText();
	// 	for (let sentenceIndex = 0; sentenceIndex < response.size(); sentenceIndex+=1) {
	// 		const utf8SentenceByteRange = response.getSourceSentence(sentenceIndex);
	// 		sentences.push(this._getSentenceFromByteRange(text, utf8SentenceByteRange));
	// 	}
	// 	return sentences;
	// }

	/*
	 * this function returns a substring of text (a string). The substring is represented by
	 * byteRange (begin and end endices) within the utf-8 encoded version of the text.
	 */
	// _getSentenceFromByteRange (text, byteRange) {
	// 	const encoder = new TextEncoder(); // string to utf-8 converter
	// 	const decoder = new TextDecoder(); // utf-8 to string converter
	// 	const utf8BytesView = encoder.encode(text);
	// 	const utf8SentenceBytes = utf8BytesView.subarray(byteRange.begin, byteRange.end);
	// 	return decoder.decode(utf8SentenceBytes);
	// }
}

export {Bergamot}
