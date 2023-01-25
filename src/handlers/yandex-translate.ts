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

export class YandexTranslate extends DummyTranslate {
	#api_key: string;
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
			url: `https://translate.yandex.net/api/v1.5/tr.json/getLangs?` +
				new URLSearchParams({
					key: this.#api_key,
					ui: "en"
				}),
		});

		const data = response.json;
		const status_code = data.code ? data.code : response.status;
		return {
			status_code: status_code,
			valid: status_code === 200,
			message: data.message
		};
	}


	async service_detect(text: string): Promise<DetectionResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translate.yandex.net/api/v1.5/tr.json/detect?` +
				new URLSearchParams({
					key: this.#api_key,
					text: text
				}),
		});

		// Data = {code: 200, lang: "en"}
		const data = response.json;

		if (response.status !== 200)
			return {status_code: response.status, message: data.message};

		return {
			status_code: response.status,
			detected_languages: [{language: data.language}]
		};
	}

	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translate.yandex.net/api/v1.5/tr.json/translate?` +
				new URLSearchParams({
					key: this.#api_key,
					text: text,
					lang: from === 'auto' ? to : `${from}-${to}`,
					format: "plain"
				}),
		});


		// Data = {code: 200, lang: "ru-en", text: ["Good day comrade!"]}
		const data = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.message};

		return {
			status_code: response.status,
			translation: data.text[0],
			detected_language: from === "auto" && data.lang ? data.lang : null
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `https://translate.yandex.net/api/v1.5/tr.json/getLangs?` +
				new URLSearchParams({
					key: this.#api_key,
					ui: "en"
				}),
		});

		// Data = {langs: {en: "English", ...}}
		const data = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.message};

		return {
			status_code: response.status,
			languages: Object.keys(data.langs)
		};
	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
