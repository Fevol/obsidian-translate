import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult,
	ValidationResult,
	TranslationResult,
	LanguagesFetchResult,
	DownloadableModel, ModelData
} from "../types";
import {FastText, FastTextModel, addOnPostRun} from "./fasttext/fasttext";

// @ts-ignore
import Worker from "./bergamot-translate/bergamot.worker";

import {requestUrl} from "obsidian";

export class BergamotTranslate extends DummyTranslate {
	model: FastTextModel;
	translation_worker: Worker;

	version: number;


	available_languages = [
		"bg", "cs", "nl", "en", "et", "de", "fr", "is", "it", "nb", "nn", "fa", "pl", "pt", "ru", "es", "uk"
	];

	status: string = '';
	data: any = null;

	constructor(plugin: TranslatorPlugin) {
		super();

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

		this.translation_worker = Worker();

		this.translation_worker.onmessage = (e: { data: any[]; }) => {
			if (e.data[0] === "import_reply") {
				this.valid = true;
			} else if (e.data[0] === "translate_reply" && e.data[1]) {
				// Set the translation result here
				this.data = e.data[1].join("\n\n");
				this.status = "translated";
			} else if (e.data[0] === "load_model_reply" && e.data[1]) {
				// Model has been loaded in the worker, update status and start translating

				// Current status of the translation worker
				let status = e.data[1];
				console.log(' ---- ', status);

			}
		}

		this.translation_worker.postMessage(["import"]);
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

	async translate(text: string, from: string = 'auto', to: string): Promise<TranslationResult> {
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};

		// Bergamot translator does not have inherent text detection capabilities, offload this responsibility to FastText worker
		// FIXME: It is possible that detected language is not in the supported models list for Bergamot; ignore
		if (from === 'auto') {
			const detections = await this.detect(text);
			if (detections.length === 0)
				return {message: "No language detected"};
			if (detections[1].language)
				from = detections[0].language;
			else
				return {message: "Language could not be identified or FastText worker has failed"};
		}

		// TODO: Language model should be available for 'from' and 'to' language

		this.translation_worker.postMessage(["translate", from, to, text]);

		while (!this.status) { }
		this.status = '';
		return {translation: this.data};

		// TODO: Internal state: wait till message is received from worker


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
