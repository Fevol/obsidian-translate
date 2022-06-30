import {DummyTranslate} from "./dummy-translate";
import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";

// FIXME: Check what translate returns when no language_from was specified

export class YandexTranslate extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		try {
			const response = await fetch("https://translate.yandex.net/api/v1.5/tr.json/getLangs?" +
				new URLSearchParams({
					key: this.api_key,
					ui: "en"
				}), {
				method: "POST",
			});
			if (response.ok) this.success();

			const data = await response.json();
			return {valid: response.ok, message: response.ok ? "" : `(UNTESTED SERVICE) Validation failed:\n${data.message}`};
		} catch (e) {
			return {valid: false, message: `(UNTESTED SERVICE) Validation failed:\n${e.message}`};
		}
	}


	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		try {
			const response = await fetch("https://translate.yandex.net/api/v1.5/tr.json/detect?" +
				new URLSearchParams({
					key: this.api_key,
					text: text
				}), {
				method: "POST"
			});
			// Data = {code: 200, lang: "en"}
			const data = await response.json();
			if (!response.ok)
				throw new Error(data.message);

			const return_values = [{language: data.language, message: "(UNTESTED SERVICE) Results may be incorrect"}];
			this.success();

			return return_values;
		}	catch (e) {
			this.failed();
			return [{message: `(UNTESTED SERVICE) Language detection failed:\n(${e.message})`}];
		}
	}

	async translate(text: string, from: string, to: string): Promise<TranslationResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};

		try {
			const response = await fetch("https://translate.yandex.net/api/v1.5/tr.json/translate?" +
				new URLSearchParams({
					key: this.api_key,
					text: text,
					lang: from === 'auto' ? to : `${from}-${to}`,
					format: "plain"
				}), {
				method: "POST",
			});
			// Data = {code: 200, lang: "ru-en", text: ["Good day comrade!"]}
			const data = await response.json();
			if (!response.ok)
				throw new Error(data.message);

			const return_values = {translation: data.text[0],
				                   detected_language: from === "auto" && data.lang ? data.lang : null,
									message: "(UNTESTED SERVICE) Results may be incorrect"};
			this.success();

			return return_values;

		} catch (e) {
			this.failed();
			return {message: `(UNTESTED SERVICE) Translation failed:\n(${e.message})`};
		}
	}

	async get_languages(): Promise<LanguagesFetchResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		try {
			const response = await fetch("https://translate.yandex.net/api/v1.5/tr.json/getLangs?" +
				new URLSearchParams({
					key: this.api_key,
					// Display language for format code, can be discarded
					ui: "en"
				}), {
				method: "POST",
			});
			// Data = {langs: {en: "English", ...}}
			const data = await response.json();
			if (!response.ok)
				throw new Error(data.message);

			const return_values = {languages: Object.keys(data.langs)};
			this.success();

			return return_values;
		} catch (e) {
			this.failed();
			return {message: `(UNTESTED SERVICE) Languages fetching failed:\n(${e.message})`};
		}
	}

}
