import {DummyTranslate} from "./dummy-translate";
import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";

export class LibreTranslate extends DummyTranslate {
	host: string;

	constructor(host: string) {
		super();
		this.host = host;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.host)
			return {valid: false, message: "Host was not specified"};

		try {
			const response = await fetch(this.host + '/languages');
			if (response.ok) this.success();

			const data = await response.json();
			return {valid: response.ok, message: response.ok ? "" : `Validation failed:\n${data.error.message}`};
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
			const response = await fetch(`${this.host}/detect`, {
				method: "POST",
				body: JSON.stringify({
					q: text
				}),
				headers: {"Content-Type": "application/json"}
			});
			const data = await response.json();
			if (!response.ok)
				throw Error(data.error.message);

			const return_values = [{language: data[0].language, confidence: data[0].confidence/100}];
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

		try {
			const response = await fetch(`${this.host}/translate`, {
				method: "POST",
				body: JSON.stringify({
					q: text,
					source: from,
					target: to
				}),
				headers: {"Content-Type": "application/json"}
			});
			const data = await response.json();
			if (!response.ok)
				throw Error(data.error.message);
			const return_values = {translation: data.translatedText,
								   detected_language: (from === "auto" && data.detectedLanguage.language  ?
									   				   data.detectedLanguage.language : null)};
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
			const response = await fetch(`${this.host}/languages`);

			const data = await response.json();
			if (!response.ok)
				throw Error(data.error.message);

			const return_values = {languages: Array.from(data).map((x: any) => {
				return x.code
			})};
			this.success();

			return return_values
		} catch (e) {
			this.failed();
			return {message: `Languages fetching failed:\n(${e.message})`};
		}
	}
}
