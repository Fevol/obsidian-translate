import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class GoogleTranslate extends DummyTranslate {
	api_key: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
	}


	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		try {
			const response = await requestUrl({
				throw: false,
				url:`https://translation.googleapis.com/language/translate/v2/languages?` +
					new URLSearchParams({
						key: this.api_key,
						target: 'en',
						model: 'nmt',
					}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});

			if (response.status === 200) this.success();
			const data = response.json;

			return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${data.error.message}`};
		} catch (e) {
			return {valid: false, message: `Validation failed:\n${e.message}`};
		}
	}


	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		try {
			const response = await requestUrl({
				throw: false,
				method: 'POST',
				url:`https://translation.googleapis.com/language/translate/v2/detect?` +
					new URLSearchParams({
						key: this.api_key,
					}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				body: JSON.stringify({
					q: text,
				}),
			});

			// Data = {"detections":[[{"language":"en", "confidence":1}], ...], ...}
			const data = response.json;
			if (response.status !== 200)
				throw new Error(data.error.message);

			const return_values = [{language: data.data.detections[0][0].language, confidence: data.data.detections[0][0].confidence}];
			this.success();
			return return_values;

		} catch (e) {
			this.failed();
			return [{message: `Language detection failed:\n(${e.message})`}];
		}

	}

	async translate(text: string, from: string, to: string): Promise<TranslationResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};
		if (from === to)
			return {translation: text};

		try {
			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`https://translation.googleapis.com/language/translate/v2?` +
					new URLSearchParams({
						key: this.api_key,
					}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				body: JSON.stringify({
					q: text,
					source: from === 'auto' ? undefined : from,
					target: to,
					format: 'text',
					model: 'nmt',
				}),
			});

			// Data = [{"text":"Hello", "detected_source_language":"en", "model":"nmt"}, ...]
			const data = response.json;
			if (response.status !== 200)
				throw new Error(data.error.message);
			const return_values = {translation: data.data.translations[0].translatedText,
								   detected_language: (from === "auto" &&  data.data.translations[0].detectedSourceLanguage) ?
													   data.data.translations[0].detectedSourceLanguage : null};
			this.success();
			return return_values;
		} catch (e) {
			this.failed();
			return {message: `Translation failed:\n(${e.message})`};
		}
	}

	async get_languages(): Promise<LanguagesFetchResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		try {
			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`https://translation.googleapis.com/language/translate/v2/languages?` +
					new URLSearchParams({
						key: this.api_key,
						target: 'en',
						model: 'nmt',
					}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});

			// Data = [{"language":"en", "name":"English"}, ...]
			const data = response.json;

			if (response.status !== 200)
				throw new Error(data.error.message);

			const return_values = {languages: data.data.languages.map((l: { language: any; name: any; }) => l.language)};
			this.success();
			return return_values;

		} catch (e) {
			this.failed();
			return {message: `Languages fetching failed:\n(${e.message})`};
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
