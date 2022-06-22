// Import plugin settings

import {DummyTranslate} from "./dummy-translate";
import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";

export class GoogleTranslate extends DummyTranslate {
	api_key: string;

	// TODO: Internally ensure that requests are not spammed
	// // Keep track of requests
	// limit_count: number = 0
	//
	// // Request limiter for service
	// request_limiter: object = {
	// 	max_requests: 10,
	// 	interval: "second",
	// }

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		try {
			const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?` +
				new URLSearchParams({
					key: this.api_key,
					target: 'en',
					model: 'nmt',
				}), {
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});
			const data = await response.json();
			return {valid: response.ok, message: response.ok ? "" : `Validation failed:\n${data.error.message}`};
		} catch (e) {
			return {valid: false, message: `Validation failed:\n${e.message}`};
		}
	}


	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!text.trim())
			return [{message: "No text was provided"}];

		try {
			const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?` +
				new URLSearchParams({
					key: this.api_key,
				}), {
				method: 'POST',
				body: JSON.stringify({
					q: text,
				}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});
			// Data = {"detections":[[{"language":"en", "confidence":1}], ...], ...}
			const data = await response.json();
			if (!response.ok)
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
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};

		try {
			const response = await fetch(`https://translation.googleapis.com/language/translate/v2?` +
				new URLSearchParams({
					key: this.api_key,
				}), {
				method: 'POST',
				body: JSON.stringify({
					q: text,
					source: from === 'auto' ? undefined : from,
					target: to,
					format: 'text',
					model: 'nmt',
				}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});


			// Data = [{"text":"Hello", "detected_source_language":"en", "model":"nmt"}, ...]
			const data = await response.json();
			if (!response.ok)
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
		try {
			const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?` +
				new URLSearchParams({
					key: this.api_key,
					target: 'en',
					model: 'nmt',
				}), {
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});
			// Data = [{"language":"en", "name":"English"}, ...]
			const data = await response.json();

			if (!response.ok)
				throw new Error(data.error.message);

			const return_values = {languages: data.data.languages.map((l: { language: any; name: any; }) => l.language)};
			this.success();
			return return_values;

		} catch (e) {
			this.failed();
			return {message: `Languages fetching failed:\n(${e.message})`};
		}
	}
}
