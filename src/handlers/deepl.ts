import {DummyTranslate} from "./dummy-translate";
import type {
	APIServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult
} from "../types";
import {requestUrl} from "obsidian";

// TODO: Allow for formality features to be accessed
// TODO: Allow for formatting to be preserved
// Check if split_sentences option causes problems
//   --> .join all the translations together

export class Deepl extends DummyTranslate {
	api_key: string;
	host: string;

	// Body size may maximally be 128KiB
	character_limit = 130000;

	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
		this.host = settings.host || 'https://api-free.deepl.com/v2';
	}


	async service_validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		this.host = "https://api.deepl.com/v2";
		try {
			const response = await requestUrl({
				url: `${this.host}/usage`,
				method: "GET",
				headers: {
					"Authorization": "DeepL-Auth-Key " + this.api_key
				}
			});
			if (response.status === 200) {
				return {valid: true, message: "Using DeepL Pro API", host: this.host};
			}

			// If request fails or API key is invalid for DeepL pro, catch error and try DeepL free
			throw "Invalid API key for DeepL Pro";
		} catch (e) {
			this.host = "https://api-free.deepl.com/v2";
			try {
				let response = await requestUrl({
					url: `${this.host}/usage`,
					method: "GET",
					headers: {
						"Authorization": "DeepL-Auth-Key " + this.api_key
					}
				});

				if (response.status !== 200)
					return {valid: false, message: "Validation failed:\nVerify correctness of API key"};

				return {valid: true, message: "Using DeepL Free API", host: this.host};
			} catch (e) {
				return {valid: false, message: "Validation failed:\nVerify correctness of API key"};
			}
		}
	}

	// FIXME: DeepL doesn't actually support language detection, this is translating the text to get the language
	//         Obviously this is not desirable, might just disable this feature for DeepL
	async service_detect(text: string): Promise<Array<DetectionResult>> {
		const response = await requestUrl({
			url: `${this.host}/translate?` + new URLSearchParams({
				text: text,
				target_lang: "en"
			}),
			method: "POST",
			contentType: "application/json",
			headers: {
				"Authorization": "DeepL-Auth-Key " + this.api_key
			}
		});

		if (response.status !== 200)
			throw new Error("Check API key")

		// Data = [{"text":"Hello", "detected_source_language":"en"}, ...]
		const data = response.json;

		return [{language: data.translations[0].detected_source_language.toLowerCase()}];
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		const response = await requestUrl({
			url: `${this.host}/translate?` + new URLSearchParams({
				text: text,
				source_lang: from === "auto" ? "" : from,
				target_lang: to,
				split_sentences: "0",
				preserve_formatting: "0",
			}),
			method: "POST",
			contentType: "application/json",
			headers: {
				"Authorization": "DeepL-Auth-Key " + this.api_key
			}
		});

		if (response.status !== 200)
			throw new Error("Check API key")

		// Data = [{"text":"Hello", "detected_source_language":"en"}, ...]
		const data = response.json;
		return {translation: data.translations[0].text,
				detected_language: (from === "auto" && data.translations[0].detected_source_language) ?
									data.translations[0].detected_source_language.toLowerCase() : null}
	}


	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			url: `${this.host}/languages`,
			method: "POST",
			contentType: "application/json",
			headers: {
				"Authorization": "DeepL-Auth-Key " + this.api_key
			}
		});

		if (response.status !== 200)
			throw new Error("Check API key")

		// Data = [{"language":"EN", "name":"English", supports_formality: true}, ...]
		const data = response.json;
		return {languages: data.map((o: any) => o.language.toLowerCase())};
	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
