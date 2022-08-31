import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

// FIXME: Check what translate returns when no language_from was specified

export class YandexTranslate extends DummyTranslate {
	api_key: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		const response = await requestUrl({
			throw: false,
			method: "POST",
			url:`https://translate.yandex.net/api/v1.5/tr.json/getLangs?` +
				new URLSearchParams({
					key: this.api_key,
					ui: "en"
				}),
		});

		const data = response.json;
		return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${data.message}`};
	}


	async service_detect(text: string): Promise<Array<DetectionResult>> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url:`https://translate.yandex.net/api/v1.5/tr.json/detect?` +
				new URLSearchParams({
					key: this.api_key,
					text: text
				}),
		});

		// Data = {code: 200, lang: "en"}
		const data = response.json;
		if (response.status !== 200)
			throw new Error(data.message);

		return [{language: data.language}];
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url:`https://translate.yandex.net/api/v1.5/tr.json/translate?` +
				new URLSearchParams({
					key: this.api_key,
					text: text,
					lang: from === 'auto' ? to : `${from}-${to}`,
					format: "plain"
				}),
		});


		// Data = {code: 200, lang: "ru-en", text: ["Good day comrade!"]}
		const data = response.json;
		if (response.status !== 200)
			throw new Error(data.message);

		return { translation: data.text[0],
				 detected_language: from === "auto" && data.lang ? data.lang : null };
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url:`https://translate.yandex.net/api/v1.5/tr.json/getLangs?` +
				new URLSearchParams({
					key: this.api_key,
					ui: "en"
				}),
		});

		// Data = {langs: {en: "English", ...}}
		const data = response.json;
		if (response.status !== 200)
			throw new Error(data.message);

		return {languages: Object.keys(data.langs)};
	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
