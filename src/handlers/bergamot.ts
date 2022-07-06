import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult,
	ValidationResult,
	TranslationResult,
	LanguagesFetchResult,
	DownloadableModel, ModelData, ModelDatasets, TranslatorPluginSettings, APIServiceSettings
} from "../types";
import {FastText, FastTextModel, addOnPostRun} from "./fasttext/fasttext";

import {Bergamot} from "./bergamot/bergamot";


import {requestUrl} from "obsidian";
import {get} from "svelte/store";


export class BergamotTranslate extends DummyTranslate {
	model: FastTextModel;
	translator: Bergamot;

	version: number;

	loaded_models: Array<string> = ['en'];
	plugin: TranslatorPlugin;

	status: string = '';
	data: any = null;

	constructor(plugin: TranslatorPlugin) {
		super();
		this.plugin = plugin;

		FastText.create(plugin).then(ft => {
			// FIXME: For some reason, you cannot catch the abort of fasttext_wasm here, so this is done in the fasttext wrapper
			//  by returning the error
			try {
				if (ft instanceof WebAssembly.RuntimeError)
					plugin.message_queue(ft.message.match(/\(([^)]+)\)/)[0].slice(1, -1));
				else {
					ft.loadModel("lid.176.ftz").then((model: FastTextModel) => {
						this.model = model;
					});
					this.validate().then((x) => {
						this.valid = x.valid;
					});
				}
			} catch (e) {
				console.log("Error loading model: " + e);
			}
		})

		// @ts-ignore
		Bergamot.create(plugin).then(bg => {
			try {
				if (bg instanceof WebAssembly.RuntimeError)
					plugin.message_queue(bg.message.match(/\(([^)]+)\)/)[0].slice(1, -1));
				else {
				//	Load additional data
				}
			} catch (e) {
				console.log("Error loading Bergamot: " + e);
			}
		})




		// this.translation_worker = Worker();
		// this.translation_worker.onmessage = (e: { data: any[]; }) => {
		// 	if (e.data[0] === "import_reply") {
		// 		this.valid = true;
		// 	} else if (e.data[0] === "translate_reply" && e.data[1]) {
		// 		// Set the translation result here
		// 		this.data = e.data[1].join("\n\n");
		// 		this.status = "translated";
		// 	} else if (e.data[0] === "load_model_reply" && e.data[1]) {
		// 		// Model has been loaded in the worker, update status and start translating
		//
		// 		// Current status of the translation worker
		// 		let status = e.data[1];
		// 		console.log(' ---- ', status);
		//
		// 	}
		// }
		// this.translation_worker.postMessage(["import"]);
	}

	async validate(): Promise<ValidationResult> {
		return {valid: this.valid};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		return BergamotTranslate.getPredictions(this.model.predict(text, 5, 0.0));
	}

	private static getPredictions(predictions: any) {
		let results = [];
		for (let i = 0; i < predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return results;
	}

	async get_model_data(from: string, to: string) {
		let is_from = from !== "en";
		let selected_language = is_from ? from : to;

		let settings: APIServiceSettings = get(this.plugin.settings).service_settings.bergamot;

		// @ts-ignore (find complains that available_languages consists of two different types)
		let language_data: ModelDatasets = settings.available_languages.find((x: DownloadableModel) => x.locale === selected_language).files[is_from ? "from" : "to"];
		const base_path = `.obsidian/${settings.storage_path}/bergamot/${selected_language}/`;

		let modelBuffer = await app.vault.adapter.readBinary(`${base_path}/${language_data.model}`);
		let shortListBuffer = await app.vault.adapter.readBinary(`${base_path}/${language_data.lex}`);
		let downloadedVocabBuffers = [];
		if (language_data.vocab !== undefined) {
			downloadedVocabBuffers = [await app.vault.adapter.readBinary(`${base_path}/${language_data.vocab}`)];
		} else {
			downloadedVocabBuffers = [await app.vault.adapter.readBinary(`${base_path}/${language_data.trgvocab}`),
				await app.vault.adapter.readBinary(`${base_path}/${language_data.srcvocab}`)];
		}
		return [modelBuffer, shortListBuffer, downloadedVocabBuffers];
	}


	async translate(text: string, from: string = 'auto', to: string): Promise<TranslationResult> {
		// this.translator.translate(text, from, to);

		// if (!text.trim())
		// 	return {message: "No text was provided"};
		// if (!to)
		// 	return {message: "No target language was provided"};
		//
		// // Bergamot translator does not have inherent text detection capabilities, offload this responsibility to FastText worker
		// // FIXME: It is possible that detected language is not in the supported models list for Bergamot; ignore
		// if (from === 'auto') {
		// 	const detections = await this.detect(text);
		// 	if (detections.length === 0)
		// 		return {message: "No language detected"};
		// 	if (detections[1].language)
		// 		from = detections[0].language;
		// 	else
		// 		return {message: "Language could not be identified or FastText worker has failed"};
		// }
		//
		// if (!this.loaded_models.includes(from)) {
		// 	this.translation_worker.postMessage(["load_model", from, 'en', this.get_model_data(from, 'en')]);
		// 	this.translation_worker.postMessage(["load_model", 'en', from, this.get_model_data('en', from)]);
		// 	this.loaded_models.push(from);
		// }
		// if (!this.loaded_models.includes(to)) {
		// 	this.translation_worker.postMessage(["load_model", to, 'en', this.get_model_data(to, 'en')]);
		// 	this.translation_worker.postMessage(["load_model", 'en', to, this.get_model_data('en', to)]);
		// 	this.loaded_models.push(to);
		// }
		//
		// // TODO: Language model should be available for 'from' and 'to' language
		//
		// this.translation_worker.postMessage(["translate", from, to, text]);
		//
		// while (!this.status) { }
		// this.status = '';
		// return {translation: this.data};
		//
		// // TODO: Internal state: wait till message is received from worker
		return {}

	}

	async get_languages(): Promise<LanguagesFetchResult> {
		const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

		let response = await requestUrl({url: `${rootURL}/latest.txt`});
		let version = response.text.trim();
		response = await requestUrl({url: `${rootURL}/${version}/registry.json`});
		let registry = response.json;

		let available_languages = Object.keys(registry).filter(x => x.startsWith("en"));
		let mapped_languages: Array<DownloadableModel> = available_languages.map(x => {
			let lang = x.substring(2, 4);

			let files_from_size = Object.values(registry[`${lang}en`]).reduce((a: any, b: any) => a + b.size, 0) as number;
			let files_to_size = Object.values(registry[`en${lang}`]).reduce((a: any, b: any) => a + b.size, 0) as number;

			let models_from_files: [any, any][] = Object.keys(registry[`${lang}en`]).map((x: any) => [x, registry[`${lang}en`][x].name]);
			let models_to_files: [any, any][] = Object.keys(registry[`en${lang}`]).map((x: any) => [x, registry[`en${lang}`][x].name]);

			return {
				files: {
					from: Object.fromEntries(models_from_files),
					to: Object.fromEntries(models_to_files),
				},
				locale: lang,
				size: files_from_size + files_to_size,
				development: registry[`en${lang}`].lex.modelType === 'dev',
			}
		});
		return {languages: mapped_languages, data: version};
	}

	// TODO: Downloadable languages = languages in registry.json (simple fetch request?)
	// async get_downloadable_languages(): Promise<LanguagesFetchResult> {
	// 	return {languages: }
	// }


	has_autodetect_capability(): boolean {
		return this.model != null;
	}
}
