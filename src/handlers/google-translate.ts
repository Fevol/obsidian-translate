import {DummyTranslate} from "./dummy-translate";
import type {
	ServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult,
	ServiceOptions
} from "./types";
import {requestUrl} from "obsidian";

export class GoogleTranslate extends DummyTranslate {
	#api_key: string;
	id = "google_translate";

	character_limit = 100000;

	constructor(settings: ServiceSettings) {
		super();
		this.#api_key = settings.api_key;
	}

	update_settings(settings: ServiceSettings): void {
		this.#api_key = settings.api_key ?? this.#api_key;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.#api_key)
			return {status_code: 400, valid: false, message: "API key was not specified"};

		const response = await requestUrl({
			throw: false,
			url: `https://translation.googleapis.com/language/translate/v2/languages?` +
				new URLSearchParams({
					key: this.#api_key,
					target: 'en',
					model: 'nmt',
				}),
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});

		const data = response.json;

		return {
			status_code: response.status,
			valid: response.status === 200,
			message: data.error?.message
		};
	}


	async service_detect(text: string): Promise<DetectionResult> {
		const response = await requestUrl({
			throw: false,
			method: 'POST',
			url: `https://translation.googleapis.com/language/translate/v2/detect?` +
				new URLSearchParams({
					key: this.#api_key,
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
			return {status_code: response.status, message: data.error.message}

		return {
			status_code: response.status,
			detected_languages: [{
				language: data.data.detections[0][0].language,
				confidence: data.data.detections[0][0].confidence
			}]
		};
	}

	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translation.googleapis.com/language/translate/v2?` +
				new URLSearchParams({
					key: this.#api_key,
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
			return {status_code: response.status, message: data.error.message}

		return {
			status_code: response.status,
			translation: data.data.translations[0].translatedText,
			detected_language: (from === "auto" && data.data.translations[0].detectedSourceLanguage) ?
				data.data.translations[0].detectedSourceLanguage : null
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translation.googleapis.com/language/translate/v2/languages?` +
				new URLSearchParams({
					key: this.#api_key,
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
			return {status_code: response.status, message: data.error.message}

		return {
			status_code: response.status,
			languages: data.data.languages.map((l: { language: any; name: any; }) => l.language)
		};
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
