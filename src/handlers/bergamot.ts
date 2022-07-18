import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult, ValidationResult, TranslationResult, LanguagesFetchResult,
	TranslatorPluginSettings, ModelFileData, LanguageModelData, FileData,
} from "../types";

import {Bergamot} from "./bergamot/bergamot";


import {requestUrl} from "obsidian";
import {get} from "svelte/store";
import t from "../l10n";


export class BergamotTranslate extends DummyTranslate {
	translator: Bergamot;
	detector: DummyTranslate = null;
	plugin: TranslatorPlugin;
	available_languages: Array<string>;

	constructor(detector: DummyTranslate = null, plugin: TranslatorPlugin, available_models: ModelFileData, path: string) {
		super();
		this.plugin = plugin;
		this.detector = detector;

		if (available_models) {
			try {
				this.translator = new Bergamot(available_models, path);
				this.translator.loadTranslationEngine();
				this.available_languages = ["en"].concat(available_models.models.map((x) => x.locale));
			} catch (e) {
				this.plugin.message_queue(`Error while loading Bergamot: ${e.message}`);
				this.translator = null;
				this.valid = false;
			}
		} else {
			this.plugin.message_queue("Bergamot binary was not properly installed");
			this.translator = null;
			this.valid = false;
		}
	}

	async validate(): Promise<ValidationResult> {
		return {valid: this.translator != null};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		return this.detector.detect(text);
	}

	async get_model_data(from: string, to: string) {
		let is_from = from !== "en";
		let selected_language = is_from ? from : to;

		let settings: TranslatorPluginSettings = get(this.plugin.settings);


		// @ts-ignore (find complains that available_languages consists of two different types - only one type will be possible though)
		let language_data: Array<FileData> = settings.service_settings.bergamot.available_languages.find((x: LanguageModelData) => x.locale === selected_language).files;
		language_data = language_data.filter((x) => x.usage === 'both' || x.usage === (is_from ? "from" : "to"));

		const base_path = `.obsidian/${settings.storage_path}/bergamot/${selected_language}/`;

		console.log(language_data);

		// let modelBuffer = await app.vault.adapter.readBinary(`${base_path}/${language_data.model}`);
		// let shortListBuffer = await app.vault.adapter.readBinary(`${base_path}/${language_data.lex}`);
		// let downloadedVocabBuffers = [];
		// if (language_data.vocab !== undefined) {
		// 	downloadedVocabBuffers = [await app.vault.adapter.readBinary(`${base_path}/${language_data.vocab}`)];
		// } else {
		// 	downloadedVocabBuffers = [await app.vault.adapter.readBinary(`${base_path}/${language_data.trgvocab}`),
		// 		await app.vault.adapter.readBinary(`${base_path}/${language_data.srcvocab}`)];
		// }
		// return [modelBuffer, shortListBuffer, downloadedVocabBuffers];
	}


	async translate(text: string, from: string = 'auto', to: string): Promise<TranslationResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};

		let detected_language = '';
		if (from === 'auto') {
			if (this.has_autodetect_capability()) {
				detected_language = (await this.detector.detect(text)).first()?.language;
				if (detected_language && detected_language !== 'auto')
					from = detected_language;
				else
					return {message: "Could not detect language"};
			} else {
				return {message: "Automatic language detection is not supported"};
			}
		}
		if (from === to) {
			return {translation: text, detected_language: from};
		}

		if (!this.available_languages.includes(from))
			return {message: `${t(from)} is not installed as a language model`};
		if (!this.available_languages.includes(to))
			return {message: `${t(to)} is not installed as a language model`};

		// @ts-ignore (new_translate does not have specific return value, but it is guaranteed to be string)
		let translation = await this.translator.translate(text, from, to) as string;

		return {translation: translation, detected_language: detected_language};
	}

	async get_languages(): Promise<LanguagesFetchResult> {
		const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

		let response = await requestUrl({url: `${rootURL}/latest.txt`});
		let version = response.text.trim();
		response = await requestUrl({url: `${rootURL}/${version}/registry.json`});
		let registry = response.json;

		let available_languages = Object.keys(registry).filter(x => x.startsWith("en"));
		let mapped_languages: Array<LanguageModelData> = available_languages.map(x => {
			const lang = x.substring(2, 4);

			let duplicates = Object.values(registry[`${lang}en`]).map((x: any) => x.name)
				     .concat(Object.values(registry[`en${lang}`]).map((x: any) => x.name))
				.filter((e: any, i: any, a: any) => a.indexOf(e) !== i);

			const models_from = Object.values(registry[`${lang}en`]).map((x: any) => {
				return { name: x.name, size: x.size as number, usage: duplicates.contains(x.name) ? "both" : "from" }
			});
			const models_to = Object.values(registry[`en${lang}`])
				.filter((x: any) => !duplicates.includes(x.name))
				.map((x: any) => {
					return { name: x.name, size: x.size as number, usage: duplicates.contains(x.name) ? "both" : "to"  }
				});

			let files = models_from.concat(models_to);

			return {
					size: files.reduce((acc, x) => acc + x.size, 0),
					locale: lang,
					files: models_from.concat(models_to),
					dev: registry[`en${lang}`].lex.modelType === 'dev',
			};
		});
		return {languages: mapped_languages, data: version};
	}

	has_autodetect_capability(): boolean {
		return this.detector != null;
	}
}
