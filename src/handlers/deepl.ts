import {DummyTranslate} from "./dummy-translate";
import type {
	APIServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult
} from "../types";
import {request} from "obsidian";

// TODO: Allow for formality features to be accessed
// TODO: Allow for formatting to be preserved
// Check if split_sentences option causes problems
//   --> .join all the translations together
// Check if language code being lower/uppercase makes a difference


// Due to CORS limitations, this package is using obsidian's request function

export class Deepl extends DummyTranslate {
	api_key: string;
	host: string;

	// // Keep track of requests
	// limit_count: number = 0
	//
	// // Request limiter for service
	// request_limiter: object = {
	// 	// Max amount of characters per interval
	// 	max_requests: 10,
	// 	interval: "second",
	// }


	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
		this.host = settings.host || 'https://api-free.deepl.com/v2';
	}


	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		this.host = "https://api.deepl.com/v2";
		try {
			let response = JSON.parse(await request({
				url: `${this.host}/usage`,
				method: "GET",
				headers: {
					"Authorization": "DeepL-Auth-Key " + this.api_key
				}
			}));

			if ("character_count" in response) {
				this.success();
				return {valid: true, message: "Using DeepL Pro API", host: this.host};
			}

			// If request fails or API key is invalid for DeepL pro, catch error and try DeepL free
			throw "Invalid API key for DeepL Pro";
		} catch (e) {
			this.host = "https://api-free.deepl.com/v2";
			try {
				let response = JSON.parse(await request({
					url: `${this.host}/usage`,
					method: "GET",
					headers: {
						"Authorization": "DeepL-Auth-Key " + this.api_key
					}
				}));
				if (!("character_count" in response))
					return {valid: false, message: "Validation failed:\nVerify correctness of API key"};

				this.success();
				return {valid: true, message: "Using DeepL Free API", host: this.host};
			} catch (e) {
				return {valid: false, message: "Validation failed:\nVerify correctness of API key"};
			}
		}
	}

	// FIXME: DeepL doesn't actually support language detection, this is translating the text to get the language
	//         Obviously this is not desirable, might just disable this feature for DeepL
	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		try {
			const response = await request({
				url: `${this.host}/translate?` + new URLSearchParams({
					text: text,
					target_lang: "en"
				}),
				method: "POST",
				contentType: "application/json",
				headers: {
					"Authorization": "DeepL-Auth-Key " + this.api_key
				}
			});

			if (!response)
				throw new Error("Check API key")

			// Data = [{"text":"Hello", "detected_source_language":"en"}, ...]
			const data = JSON.parse(response);

			const return_values = [{language: data.translations[0].detected_source_language.toLowerCase()}];
			this.success();

			return return_values
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
			const response = await request({
				url: `${this.host}/translate?` + new URLSearchParams({
					text: text,
					source_lang: from === "auto" ? "" : from,
					target_lang: to,
					split_sentences: "0",
					preserve_formatting: "0",
				}),
				method: "POST",
				contentType: "application/json",
				headers: {
					"Authorization": "DeepL-Auth-Key " + this.api_key
				}
			});

			if (!response)
				throw new Error("Check API key")

			// Data = [{"text":"Hello", "detected_source_language":"en"}, ...]
			const data = JSON.parse(response);
			const return_values = {translation: data.translations[0].text,
				detected_language: (from === "auto" && data.translations[0].detected_source_language) ?
									data.translations[0].detected_source_language.toLowerCase() : null}
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
			const response = await request({
				url: `${this.host}/languages`,
				method: "POST",
				contentType: "application/json",
				headers: {
					"Authorization": "DeepL-Auth-Key " + this.api_key
				}
			});

			if (!response)
				throw new Error("Check API key")

			// Data = [{"language":"EN", "name":"English", supports_formality: true}, ...]
			const data = JSON.parse(response);
			const return_values = {languages: data.map((o: any) => o.language.toLowerCase())};
			this.success();

			return return_values;
		} catch (e) {
			this.failed();
			return {message: `Languages fetching failed:\n(${e.message})`};
		}


	}

	has_autodetect_capability(): boolean {
		return true;
	}

}
