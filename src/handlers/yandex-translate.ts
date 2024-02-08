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

// FIXME: Check what translate returns when no language_from was specified

interface YandexBaseResult {
	code?: number
	message?: string
	// Also contains details field with @type and requestId
}

interface YandexTranslationResult extends YandexBaseResult {
	translations: Array<{text: string, detectedLanguageCode?: string}>
}

interface YandexLanguageResult extends YandexBaseResult {
	languages: Array<{code: string, name: string}>
}

interface YandexDetectionResult extends YandexBaseResult {
	languageCode: string
}

export class YandexTranslate extends DummyTranslate {
	#api_key?: string;
	id = "yandex_translate";

	character_limit = 10000;

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
			method: "POST",
			url: `https://translate.api.cloud.yandex.net/translate/v2/languages`,
			headers: {
				"Authorization": `Api-Key ${this.#api_key}`
			}
		});

		const data: YandexLanguageResult = response.json;
		return {
			status_code: response.status,
			valid: response.status === 200,
			message: data.message
		};
	}


	async service_detect(text: string): Promise<DetectionResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translate.api.cloud.yandex.net/translate/v2/detect`,
			// NOTE: Also supports the languageCodeHints setting (array of ISO 639-1 codes that give priority to a specific language)
			body: JSON.stringify({text: text}),
			headers: {
				"Authorization": `Api-Key ${this.#api_key}`
			}
		});

		// Data = {code: 200, lang: "en"}
		const data: YandexDetectionResult = response.json;

		if (response.status !== 200)
			return {status_code: response.status, message: data.message};

		return {
			status_code: response.status,
			detected_languages: [{language: data.languageCode}]
		};
	}

	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translate.api.cloud.yandex.net/translate/v2/translate`,
			body: JSON.stringify({
				texts: [text],
				targetLanguageCode: to,
			}),
			headers: {
				"Authorization": `Api-Key ${this.#api_key}`
			}
		});


		// Data = {code: 200, lang: "ru-en", text: ["Good day comrade!"]}
		const data: YandexTranslationResult = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.message};

		return {
			status_code: response.status,
			translation: data.translations[0].text,
			detected_language: from === "auto" && data.translations[0].detectedLanguageCode ? data.translations[0].detectedLanguageCode : undefined
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translate.api.cloud.yandex.net/translate/v2/languages`,
			headers: {
				"Authorization": `Api-Key ${this.#api_key}`
			}
		});

		// Data = {langs: {en: "English", ...}}
		const data: YandexLanguageResult = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.message};

		return {
			status_code: response.status,
			languages: data.languages.map(lang => lang.code)
		};
	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
