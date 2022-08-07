import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class BingTranslator extends DummyTranslate {
	api_key: string;
	region: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
		this.region = settings.region;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		// TODO: Check if there is a better way to validate the API key
		try {
			const headers: any = {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
			}
			if (this.region)
				headers["Ocp-Apim-Subscription-Region"] = this.region;

			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&` +
					new URLSearchParams({
						from: "",
						to: "en",
						textType: "plain"
					}),
				headers: headers,
				body: JSON.stringify([{Text: ''}]),
			});

			if (response.status === 200) this.success();
			const data = response.json;

			return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${data.error.message}`};
		} catch (e) {
			return {valid: false, message: `Validation failed:\n${e.message}`};
		}

	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		const headers: any = {
			"Content-Type": "application/json",
			"Ocp-Apim-Subscription-Key": this.api_key,
		}
		if (this.region)
			headers["Ocp-Apim-Subscription-Region"] = this.region;

		try {
			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`https://api.cognitive.microsofttranslator.com/detect?api-version=3.0&scope=text` +
					new URLSearchParams({
						textType: "plain"
					}),
				headers: headers,
				body: JSON.stringify([{Text: text}]),
			});


			const data = response.json;
			if (response.status !== 200)
				throw new Error(data.error.message);
			let results = [{language: data[0].language, confidence: data[0].score}];
			if (data[0].alternatives)
				results = results.concat(data[0].alternatives.map((alternative: any) => ({
					language: alternative.language,
					confidence: alternative.score
				})));
			this.success();

			return results;
		} catch (e) {
			this.failed();
			return [{message: `Language detection failed:\n(${e.message})`}];
		}
	}

	async translate(text: string, from: string = 'auto', to: string): Promise<TranslationResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};
		if (from === to)
			return {translation: text};

		try {
			const headers: any = {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
			}
			if (this.region)
				headers["Ocp-Apim-Subscription-Region"] = this.region;

			const response = await requestUrl({
				throw: false,
				method: "POST",
				url:`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&` +
					new URLSearchParams({
						from: from === "auto" ? "" : from,
						to: to,
						textType: "plain"
					}),
				headers: headers,
				body: JSON.stringify([{Text: text}]),
			});

			const data = response.json;
			if (response.status !== 200)
				throw new Error(data.error.message);
			const return_values = {translation: data[0].translations[0].text,
								 detected_language: (from === "auto" && data[0].detectedLanguage.language) ? data[0].detectedLanguage.language : null}
			this.success();
			return return_values;
		} catch (e) {
			this.failed();
			return {message: `Translation failed:\n(${e.message})`};
		}
	}

	// No API key required, service may be invalid
	async get_languages(): Promise<LanguagesFetchResult> {
		try {
			const response = await requestUrl({
				throw: false,
				method: "GET",
				url:`https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation`,
				headers: { "Content-Type": "application/json" },
			});

			const data = response.json;

			if (response.status !== 200)
				throw new Error(data.error.message);
			this.success();

			return {languages: Object.keys(data.translation)};
		}
		catch (e) {
			this.failed();
			return {message: `Languages fetching failed:\n(${e.message})`};
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
