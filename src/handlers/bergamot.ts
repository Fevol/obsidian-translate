import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult, ValidationResult, TranslationResult,
	LanguagesFetchResult, ModelFileData, LanguageModelData
} from "../types";

import {Bergamot} from "./bergamot/bergamot";

import {requestUrl} from "obsidian";
import t from "../l10n";


export class BergamotTranslate extends DummyTranslate {
	translator: Bergamot;
	detector: DummyTranslate = null;
	plugin: TranslatorPlugin;
	available_languages: Array<string> = ['en'];

	update_data(available_models: ModelFileData, path: string) {
		if (available_models) {
			this.available_languages = ["en"].concat(available_models.models.map((x) => x.locale));
			this.translator.available_models = available_models;
		}
		if (path && this.translator)
			this.translator.path = path;
	}

	setup_service(available_models: ModelFileData, path: string) {
		if (!this.translator) {
			if (available_models) {
				try {
					this.translator = new Bergamot(available_models, path);
					this.translator.loadTranslationEngine();
					this.available_languages = ["en"].concat(available_models.models.map((x) => x.locale));
					this.valid = true;
				} catch (e) {
					this.plugin.message_queue(`Error while loading Bergamot: ${e.message}`);
					this.translator = null;
					this.valid = false;
				}
			} else {
				this.plugin.message_queue("Bergamot binary is not installed");
				this.translator = null;
				this.valid = false;
			}
		}
	}

	constructor(detector: DummyTranslate = null, plugin: TranslatorPlugin, available_models: ModelFileData, path: string) {
		super();
		this.plugin = plugin;
		this.detector = detector;
		this.valid = false;
		this.setup_service(available_models, path);
	}

	async validate(): Promise<ValidationResult> {
		return {valid: this.translator != null};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		return this.detector.detect(text);
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

		return {translation: await this.translator.translate(text, from, to), detected_language: detected_language};
	}

	async get_languages(): Promise<LanguagesFetchResult> {
		const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

		let response = await requestUrl({url: `${rootURL}/latest.txt`});
		let version = response.text.trim();
		response = await requestUrl({url: `${rootURL}/${version}/registry.json`});
		let registry = response.json;


		let all_language_pairs = Object.keys(registry);

		// TODO: Check if Bergamot will add bidirectional translation for all languages
		//  If not, support one-directional translation (will require additional checks)
		// Only support languages that support translation in both directions
		let available_languages = all_language_pairs
			.filter(x => {return x.startsWith("en")})
			.map(x => {return x.substring(2)})
			.filter(x => {return all_language_pairs.includes(`${x}en`)});
		let mapped_languages: Array<LanguageModelData> = available_languages.map(x => {
			let duplicates = Object.values(registry[`${x}en`]).map((x: any) => x.name)
				     .concat(Object.values(registry[`en${x}`]).map((x: any) => x.name))
				.filter((e: any, i: any, a: any) => a.indexOf(e) !== i);

			const models_from = Object.values(registry[`${x}en`]).map((x: any) => {
				return { name: x.name, size: x.size as number, usage: duplicates.contains(x.name) ? "both" : "from" }
			});
			const models_to = Object.values(registry[`en${x}`])
				.filter((x: any) => !duplicates.includes(x.name))
				.map((x: any) => {
					return { name: x.name, size: x.size as number, usage: duplicates.contains(x.name) ? "both" : "to"  }
				});

			let files = models_from.concat(models_to);

			return {
					size: files.reduce((acc, x) => acc + x.size, 0),
					locale: x,
					files: models_from.concat(models_to),
					dev: registry[`en${x}`].lex.modelType === 'dev',
			};
		});
		return {languages: mapped_languages, data: version};
	}

	has_autodetect_capability(): boolean {
		return this.detector != null && this.detector.valid;
	}
}
