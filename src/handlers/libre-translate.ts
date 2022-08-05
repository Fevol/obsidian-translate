import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class LibreTranslate extends DummyTranslate {
	host: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.host = settings.host;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.host)
			return {valid: false, message: "Host was not specified"};

		try {
			const response = await requestUrl({
				throw: false,
				method: "GET",
				url:`${this.host}/languages`,
			});

			if (response.status === 200) this.success();

			const data = response.json;
			return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${data.error.message}`};
		} catch (e) {
			let message = e.message;
			// TODO: Ask Licat if requestUrl could actually return a readable message
			if (e.message === 'net::ERR_CONNECTION_REFUSED')
				message = "Failed to fetch";


			return {valid: false, message: `Validation failed:\n${message}`};
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
				method: "GET",
				url:`${this.host}/detect`,
				body: JSON.stringify({ q: text }),
				headers: {"Content-Type": "application/json"}
			});


			const data = response.json;
			if (response.status !== 200)
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
			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`${this.host}/translate`,
				body: JSON.stringify({
					q: text,
					source: from,
					target: to
				}),
				headers: {"Content-Type": "application/json"}
			});

			const data = response.json;
			if (response.status !== 200)
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
			const response = await requestUrl({
				throw: false,
				method: "GET",
				url:`${this.host}/languages`,
			});

			const data = response.json;
			if (response.status !== 200)
				throw Error(data.error.message);

			const return_values = {languages: Array.from(data).map((x: any) => x.code)};
			this.success();

			return return_values
		} catch (e) {
			this.failed();
			return {message: `Languages fetching failed:\n(${e.message})`};
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
