import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class LibreTranslate extends DummyTranslate {
	host: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.host = settings.host;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.host)
			return {valid: false, message: "Host was not specified"};

		try {
			const response = await requestUrl({
				throw: false,
				method: "GET",
				url:`${this.host}/languages`,
			});

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

	async service_detect(text: string): Promise<DetectionResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url:`${this.host}/detect`,
			body: JSON.stringify({ q: text }),
			headers: {"Content-Type": "application/json"}
		});


		const data = response.json;
		if (response.status !== 200)
			throw Error(data.error);

		return {
			status_code: response.status,
			detected_languages: response.status === 200 ? [{language: data[0].language, confidence: data[0].confidence/100}] : undefined
		};
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
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
			throw Error(data.error);

		return {translation: data.translatedText,
			    detected_language: (from === "auto" && data.detectedLanguage.language  ? data.detectedLanguage.language : null)};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			method: "GET",
			url:`${this.host}/languages`,
		});

		const data = response.json;
		if (response.status !== 200)
			throw Error(data.error);

		return {languages: Array.from(data).map((x: any) => x.code)};
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
