import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult, ValidationResult, TranslationResult, LanguagesFetchResult,
	DownloadableModel, ModelDatasets, TranslatorPluginSettings,
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

	constructor(detector: DummyTranslate = null, plugin: TranslatorPlugin, available_models: Array<DownloadableModel>, path: string) {
		super();
		this.plugin = plugin;
		this.detector = detector;

		this.translator = new Bergamot(available_models, path);
		this.translator.new_loadTranslationEngine();

		this.available_languages = ["en"].concat(available_models.map((model: any) => model.locale));
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
		let language_data: ModelDatasets = settings.service_settings.bergamot.available_languages.find((x: DownloadableModel) => x.locale === selected_language).files[is_from ? "from" : "to"];
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

		if (!this.available_languages.includes(from))
			return {message: `${t(from)} is not supported`};
		if (!this.available_languages.includes(to))
			return {message: `${t(to)} is not supported`};

		// @ts-ignore (new_translate does not have specific return value, but it is guaranteed to be string)
		let translation = await this.translator.new_translate(text, from, to) as string;

		return {translation: translation, detected_language: detected_language};
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

	has_autodetect_capability(): boolean {
		return this.detector != null;
	}
}
