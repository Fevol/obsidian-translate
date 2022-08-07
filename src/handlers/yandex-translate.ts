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

	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		try {
			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`https://translate.yandex.net/api/v1.5/tr.json/getLangs?` +
					new URLSearchParams({
						key: this.api_key,
						ui: "en"
					}),
			});

			if (response.status === 200) this.success();

			const data = response.json;
			return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${data.message}`};
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

			const return_values = [{language: data.language}];
			this.success();

			return return_values;
		}	catch (e) {
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

			const return_values = { translation: data.text[0],
				                    detected_language: from === "auto" && data.lang ? data.lang : null };
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

			const return_values = {languages: Object.keys(data.langs)};
			this.success();

			return return_values;
		} catch (e) {
			this.failed();
			return {message: `(UNTESTED SERVICE) Languages fetching failed:\n(${e.message})`};
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
