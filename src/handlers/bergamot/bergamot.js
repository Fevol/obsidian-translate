import {get} from "svelte/store";
import bergamotModularized from './bergamot-translator-worker'

var bergamotModule = null

let postRunFunc = null;
const addOnPostRun = function (func) {
	postRunFunc = func;
};

class Bergamot {

	translationService = {};


	constructor(plugin) {
		this.plugin = plugin;
	}

	async initialize() {
		bergamotModule = await bergamotModularized();
		if (postRunFunc)
			postRunFunc();
		this.f = new bergamotModule.Bergamot();
		console.log(this.f);
		this.translationService = new bergamotModule.BlockingService({})
	}

	static async create(plugin) {
		try {
			const o = new Bergamot(plugin);
			await o.initialize();
			return o;
		} catch (e) {
			return e;
		}
	}

	async translate() {
		const modelConfig = `beam-size: 1
normalize: 1.0
word-penalty: 0
max-length-break: 128
mini-batch-words: 1024
workspace: 128
max-length-factor: 2.0
skip-cost: true
cpu-threads: 0
quiet: true
quiet-translation: true
gemm-precision: int8shiftAll
`;


		var translationModel = new BergamotModule.TranslationModel(modelConfig, '', '', '');
		var responseOptions = new BergamotModule.ResponseOptions();
		let result = this.translationService.translate(translationModel, 'input', responseOptions);
	}

}




// // All variables specific to translation service
// var translationService, responseOptions, input = undefined;
// // A map of language-pair to TranslationModel object
// var translationModels = new Map();
//
// // const BERGAMOT_TRANSLATOR_MODULE = "bergamot-translator-worker.js";
// // const MODEL_REGISTRY = "registry.json";
// // const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";
// let version = null;
// let modelRegistry = null;
//
// const encoder = new TextEncoder(); // string to utf-8 converter
// const decoder = new TextDecoder(); // utf-8 to string converter
//
// const start = Date.now();
// let moduleLoadStart;
// var Module = {
// 	preRun: [function() {
// 		log(`Time until Module.preRun: ${(Date.now() - start) / 1000} secs`);
// 		moduleLoadStart = Date.now();
// 	}],
// 	onRuntimeInitialized: async function() {
// 		// log(`Wasm Runtime initialized Successfully (preRun -> onRuntimeInitialized) in ${(Date.now() - moduleLoadStart) / 1000} secs`);
// 		// let resp = await fetch(`${rootURL}/latest.txt`);
// 		// version = await resp.text();
// 		// resp = await fetch(`${rootURL}/${version}/${MODEL_REGISTRY}`);
// 		// modelRegistry = await resp.json();
// 		postMessage([`import_reply`]);
// 	}
// };
//
// const log = (message) => {
// 	console.debug(message);
// }
//
// const isExprimental = (from, to) => {
// 	return `${from}${to}` in modelRegistry && modelRegistry[`${from}${to}`]["model"].modelType === "dev"
// }
//
// onmessage = async function(e) {
// 	const command = e.data[0];
// 	log(`Message '${command}' received from main script`);
// 	let result = "";
// 	if (command === 'import') {
// 		// importScripts("bergamot-translator-worker.js");
// 		postMessage([`${command}_reply`, result]);
// 	} else if (command === 'load_model') {
// 		let start = Date.now();
// 		let from = e.data[1];
// 		let to = e.data[2];
// 		let buffers = e.data[3];
// 		let modelBuffer = buffers[0];
// 		let shortListBuffer = buffers[1];
// 		let downloadedVocabBuffers = buffers[2];
// 		try {
// 			await constructTranslationService();
// 			await constructTranslationModel(from, to, modelBuffer, shortListBuffer, downloadedVocabBuffers);
// 			// log(`Model '${from}${to}' successfully constructed. Time taken: ${(Date.now() - start) / 1000} secs`);
// 			// result = "Model successfully loaded";
// 			// if (isExprimental(from, to) || isExprimental(from, 'en') || isExprimental('en', to)) {
// 			// 	result +=  ". This model is experimental"
// 			// }
// 		} catch (error) {
// 			// log(`Model '${from}${to}' construction failed: '${error.message}'`);
// 			// result = "Model loading failed";
// 		}
// 		// log(`'${command}' command done, Posting message back to main script`);
// 		postMessage([`${command}_reply`, result]);
// 	} else if (command === 'translate') {
// 		const from = e.data[1];
// 		const to = e.data[2];
// 		const inputParagraphs = e.data[3];
// 		let inputWordCount = 0;
// 		inputParagraphs.forEach(sentence => {
// 			inputWordCount += sentence.trim().split(" ").filter(word => word.trim() !== "").length;
// 		})
// 		let start = Date.now();
// 		try {
// 			result = translate(from, to, inputParagraphs);
// 			const secs = (Date.now() - start) / 1000;
// 			log(`Translation '${from}${to}' Successful. Speed: ${Math.round(inputWordCount / secs)} WPS (${inputWordCount} words in ${secs} secs)`);
// 		} catch (error) {
// 			log(`Error: ${error.message}`);
// 		}
// 		log(`'${command}' command done, Posting message back to main script`);
// 		postMessage([`${command}_reply`, result]);
// 	}
// }
//
// // This function downloads file from a url and returns the array buffer
// // const downloadAsArrayBuffer = async(url) => {
// // 	const response = await fetch(url);
// // 	if (!response.ok) {
// // 		throw Error(`Downloading ${url} failed: HTTP ${response.status} - ${response.statusText}`);
// // 	}
// // 	return response.arrayBuffer();
// // }
//
// // This function constructs and initializes the AlignedMemory from the array buffer and alignment size
// const prepareAlignedMemoryFromBuffer = async (buffer, alignmentSize) => {
// 	var byteArray = new Int8Array(buffer);
// 	log(`Constructing Aligned memory. Size: ${byteArray.byteLength} bytes, Alignment: ${alignmentSize}`);
// 	var alignedMemory = new Module.AlignedMemory(byteArray.byteLength, alignmentSize);
// 	log(`Aligned memory construction done`);
// 	const alignedByteArrayView = alignedMemory.getByteArrayView();
// 	alignedByteArrayView.set(byteArray);
// 	log(`Aligned memory initialized`);
// 	return alignedMemory;
// }
//
// // Instantiate the Translation Service
// const constructTranslationService = async () => {
// 	if (!translationService) {
// 		var translationServiceConfig = {};
// 		log(`Creating Translation Service with config: ${translationServiceConfig}`);
// 		translationService = new Module.BlockingService(translationServiceConfig);
// 		log(`Translation Service created successfully`);
// 	}
// }
//
// const constructTranslationModel = async (from, to, modelBuffer, shortListBuffer, downloadedVocabBuffers) => {
// 	// Delete all previously constructed translation models and clear the map
//
// 	// TODO: Check if the clear step if important or not!
// 	// translationModels.forEach((value, key) => {
// 	// 	log(`Destructing model '${key}'`);
// 	// 	value.delete();
// 	// });
// 	// translationModels.clear();
//
// 	// If none of the languages is English then construct multiple models with
// 	// English as a pivot language.
// 	// if (from !== 'en' && to !== 'en') {
// 	// 	log(`Constructing model '${from}${to}' via pivoting: '${from}en' and 'en${to}'`);
// 	// 	await Promise.all([constructTranslationModelInvolvingEnglish(from, 'en'),
// 	// 		constructTranslationModelInvolvingEnglish('en', to)]);
// 	// }
// 	// else {
// 	// 	log(`Constructing model '${from}${to}'`);
// 	// 	await constructTranslationModelInvolvingEnglish(from, to);
// 	// }
// // }
//
// 	// TODO: Check if model is already loaded in translationModels, if so, just ignore this step
//
// 	const languagePair = `${from}${to}`;
//
// 	/*Set the Model Configuration as YAML formatted string.
// 	  For available configuration options, please check: https://marian-nmt.github.io/docs/cmd/marian-decoder/
// 	  Vocab files are re-used in both translation directions for some models
// 	  const vocabLanguagePair = from === "en" ? `${to}${from}` : languagePair;
// 	  const modelConfig = `models:
// 		- /${languagePair}/model.${languagePair}.intgemm.alphas.bin
// 		vocabs:
// 		- /${languagePair}/vocab.${vocabLanguagePair}.spm
// 		- /${languagePair}/vocab.${vocabLanguagePair}.spm
// 		beam-size: 1
// 		normalize: 1.0
// 		word-penalty: 0
// 		max-length-break: 128
// 		mini-batch-words: 1024
// 		workspace: 128
// 		max-length-factor: 2.0
// 		skip-cost: true
// 		cpu-threads: 0
// 		quiet: true
// 		quiet-translation: true
// 		shortlist:
// 			- /${languagePair}/lex.${languagePair}.s2t
// 			- 50
// 			- 50
// 		`;
// 		*/
//
// 	// TODO: gemm-precision: int8shiftAlphaAll (for the models that support this)
// 	// DONOT CHANGE THE SPACES BETWEEN EACH ENTRY OF CONFIG
// 	const modelConfig = `beam-size: 1
// normalize: 1.0
// word-penalty: 0
// max-length-break: 128
// mini-batch-words: 1024
// workspace: 128
// max-length-factor: 2.0
// skip-cost: true
// cpu-threads: 0
// quiet: true
// quiet-translation: true
// gemm-precision: int8shiftAll
// `;
//
// 	// const commonPath = `${rootURL}/${version}/${languagePair}`
// 	// const modelFile = `${commonPath}/${modelRegistry[languagePair]["model"].name}`;
// 	// let vocabFiles;
// 	// const shortlistFile = `${commonPath}/${modelRegistry[languagePair]["lex"].name}`;
// 	// if (("srcvocab" in modelRegistry[languagePair]) && ("trgvocab" in modelRegistry[languagePair])) {
// 	// 	vocabFiles = [`${commonPath}/${modelRegistry[languagePair]["srcvocab"].name}`,
// 	// 		`${commonPath}/${modelRegistry[languagePair]["trgvocab"].name}`];
// 	// }
// 	// else {
// 	// 	vocabFiles = [`${commonPath}/${modelRegistry[languagePair]["vocab"].name}`,
// 	// 		`${commonPath}/${modelRegistry[languagePair]["vocab"].name}`];
// 	// }
// 	// const uniqueVocabFiles = new Set(vocabFiles);
// 	// log(`modelFile: ${modelFile}\nshortlistFile: ${shortlistFile}\nNo. of unique vocabs: ${uniqueVocabFiles.size}`);
// 	// uniqueVocabFiles.forEach(item => log(`unique vocabFile: ${item}`));
//
// 	// Download the files as buffers from the given urls
// 	let start = Date.now();
//
// 	// let settings = get(plugin.settings).service_settings.bergamot;
// 	// let is_from = from !== "en";
// 	// let selected_language = is_from ? from : to;
// 	//
// 	// let language_data = settings.available_languages.find((x) => x.locale === selected_language).files[is_from ? "from" : "to"];
// 	// const base_path = `.obsidian/${settings.storage_path}/bergamot/${selected_language}/`;
// 	//
// 	// let modelBuffer = await app.vault.adapter.readBinary(`${base_path}/${language_data.model}`);
// 	// let shortListBuffer = await app.vault.adapter.readBinary(`${base_path}/${language_data.lex}`);
// 	// let downloadedVocabBuffers = [];
// 	// if (language_data.vocab !== undefined) {
// 	// 	downloadedVocabBuffers = [await app.vault.adapter.readBinary(`${base_path}/${language_data.vocab}`)];
// 	// } else {
// 	// 	downloadedVocabBuffers = [await app.vault.adapter.readBinary(`${base_path}/${language_data.trgvocab}`),
// 	// 		await app.vault.adapter.readBinary(`${base_path}/${language_data.srcvocab}`)];
// 	// }
//
// 	// const downloadedBuffers = await Promise.all([downloadAsArrayBuffer(modelFile), downloadAsArrayBuffer(shortlistFile)]);
// 	// const modelBuffer = downloadedBuffers[0];
// 	// const shortListBuffer = downloadedBuffers[1];
//
// 	// const downloadedVocabBuffers = [];
// 	// for (let item of uniqueVocabFiles.values()) {
// 	// 	downloadedVocabBuffers.push(await downloadAsArrayBuffer(item));
// 	// }
// 	// log(`Total Download time for all files of '${languagePair}': ${(Date.now() - start) / 1000} secs`);
//
// 	// Construct AlignedMemory objects with downloaded buffers
// 	let constructedAlignedMemories = await Promise.all([prepareAlignedMemoryFromBuffer(modelBuffer, 256),
// 		prepareAlignedMemoryFromBuffer(shortListBuffer, 64)]);
// 	let alignedModelMemory = constructedAlignedMemories[0];
// 	let alignedShortlistMemory = constructedAlignedMemories[1];
// 	let alignedVocabsMemoryList = new Module.AlignedMemoryList;
// 	for(let item of downloadedVocabBuffers) {
// 		let alignedMemory = await prepareAlignedMemoryFromBuffer(item, 64);
// 		alignedVocabsMemoryList.push_back(alignedMemory);
// 	}
// 	for (let vocabs=0; vocabs < alignedVocabsMemoryList.size(); vocabs++) {
// 		log(`Aligned vocab memory${vocabs+1} size: ${alignedVocabsMemoryList.get(vocabs).size()}`);
// 	}
// 	log(`Aligned model memory size: ${alignedModelMemory.size()}`);
// 	log(`Aligned shortlist memory size: ${alignedShortlistMemory.size()}`);
//
// 	log(`Translation Model config: ${modelConfig}`);
// 	var translationModel = new Module.TranslationModel(modelConfig, alignedModelMemory, alignedShortlistMemory, alignedVocabsMemoryList);
// 	translationModels.set(languagePair, translationModel);
// }
//
// const translate = (from, to, paragraphs) => {
// 	// If none of the languages is English then perform translation with
// 	// English as a pivot language.
// 	if (from !== 'en' && to !== 'en') {
// 		log(`Translating '${from}${to}' via pivoting: '${from}en' -> 'en${to}'`);
// 		let translatedParagraphsInEnglish = translateInvolvingEnglish(from, 'en', paragraphs);
// 		return translateInvolvingEnglish('en', to, translatedParagraphsInEnglish);
// 	}
// 	else {
// 		log(`Translating '${from}${to}'`);
// 		return translateInvolvingEnglish(from, to, paragraphs);
// 	}
// }
//
// const translateInvolvingEnglish = (from, to, paragraphs) => {
// 	const languagePair = `${from}${to}`;
// 	if (!translationModels.has(languagePair)) {
// 		throw Error(`Please load translation model '${languagePair}' before translating`);
// 	}
// 	translationModel = translationModels.get(languagePair);
//
// 	// Instantiate the arguments of translate() API i.e. ResponseOptions and input (vector<string>)
// 	var responseOptions = new Module.ResponseOptions();
// 	let input = new Module.VectorString;
//
// 	// Initialize the input
// 	paragraphs.forEach(paragraph => {
// 		// prevent empty paragraph - it breaks the translation
// 		if (paragraph.trim() === "") {
// 			return;
// 		}
// 		input.push_back(paragraph.trim())
// 	})
//
// 	// Access input (just for debugging)
// 	log(`Input size: ${input.size()}`);
//
// 	// Translate the input, which is a vector<String>; the result is a vector<Response>
// 	let result = translationService.translate(translationModel, input, responseOptions);
//
// 	const translatedParagraphs = [];
// 	const translatedSentencesOfParagraphs = [];
// 	const sourceSentencesOfParagraphs = [];
// 	for (let i = 0; i < result.size(); i++) {
// 		translatedParagraphs.push(result.get(i).getTranslatedText());
// 		translatedSentencesOfParagraphs.push(getAllTranslatedSentencesOfParagraph(result.get(i)));
// 		sourceSentencesOfParagraphs.push(getAllSourceSentencesOfParagraph(result.get(i)));
// 	}
//
// 	responseOptions.delete();
// 	input.delete();
// 	return translatedParagraphs;
// }
//
// // This function extracts all the translated sentences from the Response and returns them.
// const getAllTranslatedSentencesOfParagraph = (response) => {
// 	const sentences = [];
// 	const text = response.getTranslatedText();
// 	for (let sentenceIndex = 0; sentenceIndex < response.size(); sentenceIndex++) {
// 		const utf8SentenceByteRange = response.getTranslatedSentence(sentenceIndex);
// 		sentences.push(_getSentenceFromByteRange(text, utf8SentenceByteRange));
// 	}
// 	return sentences;
// }
//
// // This function extracts all the source sentences from the Response and returns them.
// const getAllSourceSentencesOfParagraph = (response) => {
// 	const sentences = [];
// 	const text = response.getOriginalText();
// 	for (let sentenceIndex = 0; sentenceIndex < response.size(); sentenceIndex++) {
// 		const utf8SentenceByteRange = response.getSourceSentence(sentenceIndex);
// 		sentences.push(_getSentenceFromByteRange(text, utf8SentenceByteRange));
// 	}
// 	return sentences;
// }
//
// // This function returns a substring of text (a string). The substring is represented by
// // byteRange (begin and end endices) within the utf-8 encoded version of the text.
// const _getSentenceFromByteRange = (text, byteRange) => {
// 	const utf8BytesView = encoder.encode(text);
// 	const utf8SentenceBytes = utf8BytesView.subarray(byteRange.begin, byteRange.end);
// 	return decoder.decode(utf8SentenceBytes);
// }

export {Bergamot, addOnPostRun};
