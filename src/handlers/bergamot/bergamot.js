/* eslint-disable no-global-assign */
/* eslint-disable no-native-reassign */
/* eslint-disable max-lines */

/* global loadEmscriptenGlueCode, Queue, serializeError, importScripts */
import {loadEmscriptenGlueCode} from "./bergamot-translator-worker";


let engineWasmLocalPath;


class TranslationMessage {
	constructor() {
		this.messageID = null;
		this.translatedParagraph = null;
		this.sourceParagraph = null;
		this.sourceLanguage = null;
		this.targetLanguage = null;
		this.tabId = null;
		this.frameId = null;
		this.origin = null;
		this.type = null;
	}
}

/*
 * this class should only be instantiated the web worker
 * to serve as a helper and placeholoder for the translation related
 * objects like the underlying wasm module, the language models etc... and
 * their states of operation
 */
class Bergamot {

	constructor(available_models, path) {
		this.available_models = available_models;
		this.path = path;

		// all variables specific to translation service
		this.translationService = null;

		// a map of language-pair to TranslationModel object
		this.translationModels = new Map();
		this.wasmModuleStartTimestamp = null;
		this.WasmEngineModule = null;
		this.engineState = this.ENGINE_STATE.LOAD_PENDING;
		this.PIVOT_LANGUAGE = "en";
		this.totalPendingElements = 0;
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


	async new_loadTranslationEngine() {
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
			console.log(`Creating Translation Service with config: ${JSON.stringify(translationServiceConfig)}`);
			this.translationService = new this.WasmEngineModule.BlockingService(translationServiceConfig);
			console.log("Translation Service created successfully");
		}
	}


	async new_translate (text, from, to) {
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
				const from_model = await this.new_getTranslationModel(from, this.PIVOT_LANGUAGE);
				const to_model = await this.new_getTranslationModel(this.PIVOT_LANGUAGE, to);
				vectorResponse = this.translationService.translateViaPivoting(from_model, to_model, text, vectorResponseOptions);
			} else {
				// translate without pivoting
				const model = await this.new_getTranslationModel(from, to);
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

	async new_getTranslationModel(from, to) {
		const languagePair = this._getLanguagePair(from, to);

		if (this.translationModels.has(languagePair)) {
			return this.translationModels.get(languagePair);
		} else {
			const target_language = from === 'en' ? to : from;
			const is_from = from === target_language;

			let model = this.available_models.find((other) => {
				return other.locale === target_language;
			});

			if (!model)
				throw "Model was not found"

			let data = model.files.from;
			// TODO: What is quality estimation and where is it used?
			let has_quality_estimation = data.qualityModel;

			// Gotten from firefox-translations/backgroundScript.js/GetLanguageModels
			let precision = data.model.endsWith("intgemm8.bin") ? "int8shiftAll" : "int8shiftAlphaAll";


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

			const alignedModelMemory = await this.loadBinary(target_language, data.model, 'model');
			const alignedShortlistMemory = await this.loadBinary(target_language, data.lex, 'lex');
			let alignedVocabMemoryList = new this.WasmEngineModule.AlignedMemoryList();
			if (data.vocab !== undefined)
				alignedVocabMemoryList.push_back(await this.loadBinary(target_language, data.vocab, 'vocab'));
			else {
				alignedVocabMemoryList.push_back(await this.loadBinary(target_language, data.srcvocab, 'srcvocab'));
				alignedVocabMemoryList.push_back(await this.loadBinary(target_language, data.trgvocab, 'trgvocab'));
			}

			let alignedQEMemory = null;
			if (data.qualityModel !== undefined) {
				alignedQEMemory = await this.loadBinary(target_language, data.qualityModel, 'qualityModel');
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

	translateOutboundTranslation(message) {
		Promise.resolve().then(function () {
			let total_words = message[0].sourceParagraph.replace(/(<([^>]+)>)/gi, "").trim()
				.split(/\s+/).length;
			const t0 = performance.now();

			/*
			 * quality scores are not required for outbound translation. So we set the
			 * corresponding flag to false before calling translate api and restore
			 * its value after the api call is complete.
			 */
			let originalQualityEstimation = message[0].withQualityEstimation;
			message[0].withQualityEstimation = false;
			const translationResultBatch = this.translate(message);
			message[0].withQualityEstimation = originalQualityEstimation;
			const timeElapsed = [total_words, performance.now() - t0];

			message[0].translatedParagraph = translationResultBatch[0];
			// and then report to the mediator
			// postMessage([
			// 	"translationComplete",
			// 	message,
			// 	timeElapsed
			// ]);
		}.bind(this));
	}

	consumeTranslationQueue() {

		while (this.translationQueue.length() > 0) {
			const translationMessagesBatch = this.translationQueue.dequeue();
			this.totalPendingElements += translationMessagesBatch.length;
			// postMessage([
			// 	"updateProgress",
			// 	["translationProgress", [`${this.totalPendingElements}`]]
			// ]);
			Promise.resolve().then(function () {
				if (translationMessagesBatch && translationMessagesBatch.length > 0) {
					try {
						let total_words = 0;
						translationMessagesBatch.forEach(message => {
							let words = message.sourceParagraph.replace(/(<([^>]+)>)/gi, "").trim()
								.split(/\s+/);
							total_words += words.length;
						});

						/*
						 * engine doesn't return QE scores for the translation of Non-HTML source
						 * messages. Therefore, always encode and pass source messages as HTML to the
						 * engine and restore them afterwards to their original form.
						 */
						const escapeHtml = text => {
							return String(text)
								.replace(/&/g, "&amp;")
								.replace(/"/g, "&quot;")
								.replace(/'/g, "&#039;")
								.replace(/</g, "&lt;")
								.replace(/>/g, "&gt;");
						};

						const non_html_qe_messages = new Map();
						translationMessagesBatch.forEach((message, index) => {
							if (message.withQualityEstimation && !message.isHTML) {
								console.log(`Plain text received to translate with QE: "${message.sourceParagraph}"`);
								non_html_qe_messages.set(index, message.sourceParagraph);
								message.sourceParagraph = escapeHtml(message.sourceParagraph);
								message.isHTML = true;
							}
						});

						const t0 = performance.now();
						const translationResultBatch = this.translate(translationMessagesBatch);
						const timeElapsed = [total_words, performance.now() - t0];

						/*
						 * restore Non-HTML source messages that were encoded to HTML before being sent to
						 * engine to get the QE scores for their translations. The translations are not
						 * required to be decoded back to non-HTML form because QE scores are embedded in
						 * the translation via html attribute.
						 */
						non_html_qe_messages.forEach((value, key) => {
							console.log("Restoring back source text and html flag");
							translationMessagesBatch[key].sourceParagraph = value;
							translationMessagesBatch[key].isHTML = false;
						});

						/*
						 * now that we have the paragraphs back, let's reconstruct them.
						 * we trust the engine will return the paragraphs always in the same order
						 * we requested
						 */
						translationResultBatch.forEach((result, index) => {
							translationMessagesBatch[index].translatedParagraph = result;
						});
						// and then report to the mediator
						// postMessage([
						// 	"translationComplete",
						// 	translationMessagesBatch,
						// 	timeElapsed
						// ]);
						this.totalPendingElements -= translationMessagesBatch.length;
						// postMessage([
						// 	"updateProgress",
						// 	["translationProgress", [`${this.totalPendingElements}`]]
						// ]);
					} catch (e) {
						// postMessage(["reportError", "translation"]);
						// postMessage(["updateProgress", "translationLoadedWithErrors"]);
						console.error("Translation error: ", e)
						throw e;
					}
				}
			}.bind(this));
		}
	}

	requestTranslation(message) {

		/*
		 * there are three possible states to the engine:
		 * INIT, LOADING, LOADED
		 * the engine is put on LOAD_PENDING mode when the worker is constructed, on
		 * LOADING when the first request is made and the engine is still on
		 * LOAD_PENDING, and on LOADED when the langauge model is loaded
		 */

		switch (this.engineState) {
			// if the engine hasn't loaded yet.
			case this.ENGINE_STATE.LOAD_PENDING:
				this.translationQueue = new Queue();
				this.engineState = this.ENGINE_STATE.LOADING;
				this.loadTranslationEngine(
					message[0].sourceLanguage,
					message[0].targetLanguage,
					message[0].withOutboundTranslation,
					message[0].withQualityEstimation
				);

				this.translationQueue.enqueue(message);
				break;
			case this.ENGINE_STATE.LOADING:

				/*
				 * if we get a translation request while the engine is
				 * being loaded, we enqueue the messae and break
				 */
				this.translationQueue.enqueue(message);
				break;

			case this.ENGINE_STATE.LOADED:
				if (message[0] && message[0].type === "outbound") {

					/*
					 * we skip the line if the message is from ot.
					 * and since we know this is OT, there's only one msg
					 */
					this.translateOutboundTranslation([message[0]]);
				} else {
					this.translationQueue.enqueue(message);
					this.consumeTranslationQueue()
				}
				break;
			default:
		}
	}

	getLanguageModels(sourceLanguage, targetLanguage, withOutboundTranslation, withQualityEstimation) {
		this.sourceLanguage = sourceLanguage;
		this.targetLanguage = targetLanguage;
		this.withOutboundTranslation = withOutboundTranslation;
		this.withQualityEstimation = withQualityEstimation;

		let languagePairs = [];
		const languagePairInfo = (languagePairName, isQE) => {
			return {
				"name": languagePairName,
				"withQualityEstimation": isQE
			};
		}
		if (this._isPivotingRequired(sourceLanguage, targetLanguage)) {
			// pivoting requires 2 translation models
			languagePairs.push(languagePairInfo(this._getLanguagePair(sourceLanguage, this.PIVOT_LANGUAGE), withQualityEstimation));
			languagePairs.push(languagePairInfo(this._getLanguagePair(this.PIVOT_LANGUAGE, targetLanguage), withQualityEstimation));
			if (withOutboundTranslation) {
				languagePairs.push(languagePairInfo(this._getLanguagePair(targetLanguage, this.PIVOT_LANGUAGE), false));
				languagePairs.push(languagePairInfo(this._getLanguagePair(this.PIVOT_LANGUAGE, sourceLanguage), false));
			}
		} else {
			languagePairs.push(languagePairInfo(this._getLanguagePair(sourceLanguage, targetLanguage), withQualityEstimation));
			if (withOutboundTranslation) {
				languagePairs.push(languagePairInfo(this._getLanguagePair(targetLanguage, sourceLanguage), false));
			}
		}
		// postMessage([
		// 	"downloadLanguageModels",
		// 	languagePairs
		// ]);
	}

	async loadLanguageModel(languageModels) {

		/*
		 * let's load the models and communicate to the caller (translation)
		 * when we are finished
		 */
		let start = Date.now();
		let isReversedModelLoadingFailed = false;
		try {
			// TODO: Load all models? Or call this function in translate iff model not found in translationModels
			this.constructTranslationService();
			await this.constructTranslationModel(languageModels, this.sourceLanguage, this.targetLanguage, this.withQualityEstimation);

			// if (this.withOutboundTranslation) {
			// 	try {
			// 		// the Outbound Translation doesn't require supporting Quality Estimation
			// 		await this.constructTranslationModel(languageModels, this.targetLanguage, this.sourceLanguage, /* withQualityEstimation=*/false);
			// 		// postMessage([
			// 		// 	"displayOutboundTranslation",
			// 		// 	null
			// 		// ]);
			// 	} catch (ex) {
			// 		console.warn("Error while constructing a reversed model for outbound translation. It might be not supported.", ex)
			// 		isReversedModelLoadingFailed = true;
			// 	}
			// }
			let finish = Date.now();
			console.log(`Model '${this.sourceLanguage}${this.targetLanguage}' successfully constructed. Time taken: ${(finish - start) / 1000} secs`);
			// postMessage([
			// 	"reportPerformanceTimespan",
			// 	"model_load_time_num",
			// 	finish-start
			// ]);

		} catch (error) {
			console.log(`Model '${this.sourceLanguage}${this.targetLanguage}' construction failed: '${error.message} - ${error.stack}'`);
			// postMessage(["reportError", "model_load"]);
			// postMessage(["updateProgress", "errorLoadingWasm"]);
			return;
		}

		this.engineState = this.ENGINE_STATE.LOADED;
		if (isReversedModelLoadingFailed) {
			// postMessage(["updateProgress","translationEnabledNoOT"]);
		} else {
			// postMessage(["updateProgress","translationEnabled"]);
		}

		this.consumeTranslationQueue();
		console.log("loadLanguageModel function complete");
	}

	deleteModels() {
		// delete all previously constructed translation models and clear the map
		this.translationModels.forEach((value, key) => {
			console.log(`Destructing model '${key}'`);
			value.delete();
		});
		this.translationModels.clear();
	}

	async loadTranslationEngine(sourceLanguage, targetLanguage, withOutboundTranslation, withQualityEstimation) {
		// postMessage([
		// 	"updateProgress",
		// 	"loadingTranslationEngine"
		// ]);
		// first we load the wasm engine
		// const response = await fetch(engineWasmLocalPath);
		// if (!response.ok) {
		// 	// postMessage(["reportError", "engine_download"]);
		// 	console.log("Error loading engine as buffer.");
		// 	return;
		// }
		// const wasmArrayBuffer = await response.arrayBuffer();

		await app.plugins.loadManifests();
		let settings = get(app.plugins.plugins['obsidian-translate'].settings)

		let path = `.obsidian/${settings.service_settings.bergamot.storage_path}/bergamot/bergamot-translator-worker.wasm`;


		if (!await app.vault.adapter.exists(path))
			throw 'Could not find bergamot-translator-worker.wasm in the vault';

		let wasmArrayBuffer = await app.vault.adapter.readBinary(path)


		const initialModule = {
			preRun: [
				function() {
					this.wasmModuleStartTimestamp = Date.now();
				}.bind(this)
			],
			onAbort() {
				console.log("Error loading wasm module.");
				// postMessage(["reportError", "engine_load"]);
				// postMessage(["updateProgress", "errorLoadingWasm"]);
			},
			onRuntimeInitialized: function() {

				/*
				 * once we have the wasm engine module successfully
				 * initialized, we then load the language models
				 */
				console.log(`Wasm Runtime initialized Successfully (preRun -> onRuntimeInitialized) in ${(Date.now() - this.wasmModuleStartTimestamp) / 1000} secs`);
				this.getLanguageModels(sourceLanguage, targetLanguage, withOutboundTranslation, withQualityEstimation);
			}.bind(this),
			wasmBinary: wasmArrayBuffer,
		};
		try {
			this.WasmEngineModule = loadEmscriptenGlueCode(initialModule);
		} catch (e) {
			console.log("Error loading wasm module:", e);
			// postMessage(["reportError", "engine_load"]);
			// postMessage(["updateProgress", "errorLoadingWasm"]);
		}
	}

	async constructTranslationModel(languageModels, from, to, withQualityEstimation) {
		if (this._isPivotingRequired(from, to)) {
			// pivoting requires 2 translation models to be constructed
			await Promise.all([
				this.constructTranslationModelHelper(languageModels, this._getLanguagePair(from, this.PIVOT_LANGUAGE), withQualityEstimation),
				this.constructTranslationModelHelper(languageModels, this._getLanguagePair(this.PIVOT_LANGUAGE, to), withQualityEstimation)
			]);
		} else {
			// non-pivoting case requires only 1 translation model
			await this.constructTranslationModelHelper(languageModels, this._getLanguagePair(from, to), withQualityEstimation);
		}
	}

	async constructTranslationModelHelper(languageModels, languagePair, withQualityEstimation) {
		console.log(`Constructing translation model ${languagePair}`);
		const modelConfigQualityEstimation = !withQualityEstimation;
		let languageModel = languageModels.find(lm => lm.name === languagePair);

		/*
		 * for available configuration options,
		 * please check: https://marian-nmt.github.io/docs/cmd/marian-decoder/
		 * DONOT CHANGE THE SPACES BETWEEN EACH ENTRY OF CONFIG
		 */
		const modelConfig = `
            beam-size: 1
            normalize: 1.0
            word-penalty: 0
            max-length-break: 128
            mini-batch-words: 1024
            workspace: 128
            max-length-factor: 2.0
            skip-cost: ${modelConfigQualityEstimation}
            cpu-threads: 0
            quiet: true
            quiet-translation: true
            gemm-precision: ${languageModel.precision}
            alignment: soft
            `;

		// download files into buffers
		let languageModelBlobs = languageModel.languageModelBlobs;
		let downloadedBuffersPromises = [];

		// TODO: replace this with the load function
		let filesToLoad = Object.entries(this.modelFileAlignments)
			.filter(([fileType]) => fileType !== "qualityModel" || withQualityEstimation)
			.filter(([fileType]) => fileType in languageModelBlobs);

		// Load blob of type
		filesToLoad.map(([fileType, fileAlignment]) => downloadedBuffersPromises.push(this.fetchFile(fileType, fileAlignment, languageModelBlobs)));

		let downloadedBuffers = await Promise.all(downloadedBuffersPromises);

		// prepare aligned memories from buffers
		let alignedMemories = Object.assign({}, ...filesToLoad.map(([name, alignment], index) => (
			{ [name]: this.prepareAlignedMemoryFromBuffer(downloadedBuffers[index].buffer, alignment) })));

		const alignedModelMemory = alignedMemories.model;
		const alignedShortlistMemory = alignedMemories.lex;
		let alignedMemoryLogMessage = `Aligned memory sizes: Model:${alignedModelMemory.size()}, Shortlist:${alignedShortlistMemory.size()}, `;

		const alignedVocabMemoryList = new this.WasmEngineModule.AlignedMemoryList();
		if ("vocab" in alignedMemories) {
			alignedVocabMemoryList.push_back(alignedMemories.vocab);
			alignedMemoryLogMessage += ` Vocab: ${alignedMemories.vocab.size()}`;
		} else if (("srcvocab" in alignedMemories) && ("trgvocab" in alignedMemories)) {
			alignedVocabMemoryList.push_back(alignedMemories.srcvocab);
			alignedVocabMemoryList.push_back(alignedMemories.trgvocab);
			alignedMemoryLogMessage += ` Src Vocab: ${alignedMemories.srcvocab.size()}`;
			alignedMemoryLogMessage += ` Trg Vocab: ${alignedMemories.trgvocab.size()}`;
		} else {
			throw new Error("vocabulary key is not found");
		}

		let alignedQEMemory = null;
		if ("qualityModel" in alignedMemories) {
			alignedQEMemory = alignedMemories.qualityModel;
			alignedMemoryLogMessage += ` QualityModel: ${alignedQEMemory.size()}`;
		}
		console.log(`Translation Model config: ${modelConfig}`);
		console.log(alignedMemoryLogMessage);

		// construct model
		let translationModel = new this.WasmEngineModule.TranslationModel(modelConfig, alignedModelMemory, alignedShortlistMemory, alignedVocabMemoryList, alignedQEMemory);
		this.translationModels.set(languagePair, translationModel);

		// report metric about supervised/non-supervised qe model only if qe feature is on
		if (withQualityEstimation) {
			let isSuperVised = alignedQEMemory !== null;
			// postMessage([
			// 	"reportQeIsSupervised",
			// 	isSuperVised
			// ]);
		}
	}

	_isPivotingRequired(from, to) {
		return from !== this.PIVOT_LANGUAGE && to !== this.PIVOT_LANGUAGE;
	}

	_getLanguagePair(from, to) {
		return `${from}${to}`;
	}

	// fetch file as buffer from given blob
	async fetchFile(fileType, fileAlignment, languageModelBlobs) {
		let buffer;
		try {
			buffer = await languageModelBlobs[fileType].arrayBuffer();
		} catch (e) {
			console.log(`Error Fetching "${fileType}:${languageModelBlobs[fileType]}" (error: ${e})`);
			throw new Error(`Error Fetching "${fileType}:${languageModelBlobs[fileType]}" (error: ${e})`);
		}
		return {
			buffer,
			fileAlignment,
			fileType,
		};
	}

	// this function constructs and initializes the AlignedMemory from the array buffer and alignment size
	prepareAlignedMemoryFromBuffer (buffer, alignmentSize) {
		let byteArray = new Int8Array(buffer);
		let alignedMemory = new this.WasmEngineModule.AlignedMemory(byteArray.byteLength, alignmentSize);
		const alignedByteArrayView = alignedMemory.getByteArrayView();
		alignedByteArrayView.set(byteArray);
		return alignedMemory;
	}

	translate (messages) {
		const from = messages[0].sourceLanguage;
		const to = messages[0].targetLanguage;

		/*
		 * vectorResponseOptions, vectorSourceText are the arguments of translate API
		 * and vectorResponse is the result where each of its item corresponds to an item
		 * of vectorSourceText in the same order.
		 */
		let vectorResponse, vectorResponseOptions, vectorSourceText;
		try {
			vectorResponseOptions = this._prepareResponseOptions(messages);
			vectorSourceText = this._prepareSourceText(messages);

			if (this._isPivotingRequired(from, to)) {
				// translate via pivoting
				const translationModelSrcToPivot = this._getLoadedTranslationModel(from, this.PIVOT_LANGUAGE);
				const translationModelPivotToTarget = this._getLoadedTranslationModel(this.PIVOT_LANGUAGE, to);
				vectorResponse = this.translationService.translateViaPivoting(translationModelSrcToPivot, translationModelPivotToTarget, vectorSourceText, vectorResponseOptions);
			} else {
				// translate without pivoting
				const translationModel = this._getLoadedTranslationModel(from, to);
				vectorResponse = this.translationService.translate(translationModel, vectorSourceText, vectorResponseOptions);
			}

			// parse all relevant information from vectorResponse
			const listTranslatedText = this._parseTranslatedText(vectorResponse);
			return listTranslatedText;
		} catch (e) {
			console.error("Error in translation engine ", e)
			// postMessage(["reportError", "marian"]);
			// postMessage(["updateProgress", "translationLoadedWithErrors"]);
			throw e; // to do: Should we re-throw?
		} finally {
			// necessary clean up
			if (typeof vectorSourceText !== "undefined") vectorSourceText.delete();
			if (typeof vectorResponseOptions !== "undefined") vectorResponseOptions.delete();
			if (typeof vectorResponse !== "undefined") vectorResponse.delete();
		}
	}

	_getLoadedTranslationModel(from, to) {
		const languagePair = this._getLanguagePair(from, to);
		if (!this.translationModels.has(languagePair)) {
			throw Error(`Translation model '${languagePair}' not loaded`);
		}
		return this.translationModels.get(languagePair);
	}

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
		return result;
	}

	// this function extracts all the translated sentences from the Response and returns them.
	getAllTranslatedSentencesOfParagraph (response) {
		const sentences = [];
		const text = response.getTranslatedText();
		for (let sentenceIndex = 0; sentenceIndex < response.size(); sentenceIndex+=1) {
			const utf8SentenceByteRange = response.getTranslatedSentence(sentenceIndex);
			sentences.push(this._getSentenceFromByteRange(text, utf8SentenceByteRange));
		}
		return sentences;
	}

	// this function extracts all the source sentences from the Response and returns them.
	getAllSourceSentencesOfParagraph (response) {
		const sentences = [];
		const text = response.getOriginalText();
		for (let sentenceIndex = 0; sentenceIndex < response.size(); sentenceIndex+=1) {
			const utf8SentenceByteRange = response.getSourceSentence(sentenceIndex);
			sentences.push(this._getSentenceFromByteRange(text, utf8SentenceByteRange));
		}
		return sentences;
	}

	/*
	 * this function returns a substring of text (a string). The substring is represented by
	 * byteRange (begin and end endices) within the utf-8 encoded version of the text.
	 */
	_getSentenceFromByteRange (text, byteRange) {
		const encoder = new TextEncoder(); // string to utf-8 converter
		const decoder = new TextDecoder(); // utf-8 to string converter
		const utf8BytesView = encoder.encode(text);
		const utf8SentenceBytes = utf8BytesView.subarray(byteRange.begin, byteRange.end);
		return decoder.decode(utf8SentenceBytes);
	}
}

export {Bergamot}
