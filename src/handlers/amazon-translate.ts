// Abandoned until I can figure out how the hell Amazon's REST API works (or how it doesn't)

import {DummyTranslate} from "./dummy-translate";
import type {
	APIServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult
} from "../types";

export class AmazonTranslate extends DummyTranslate {
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

		try {
			// Will not contribute to character quota, as it's translating to the same language
			const response = await fetch(`https://translate.${this.region}.amazonaws.com/TranslateText`, {
				body: JSON.stringify({
					Text: 'I',
					SourceLanguageCode: 'en',
					TargetLanguageCode: 'en',
				}),
				headers: {
					'Action': 'TranslateText',
					'Version': '2017-07-01',
					'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
					'X-Amz-Date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
					'Content-Type': 'application/x-amz-json-1.1',
					'X-Amz-Target': `AWSShineFrontendService_20170701.TranslateText`,
				},
			});

			if(response.ok) this.success();

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
			// Get first 20 words of text, not all words need to be included to get proper detection
			const words = text.split(/\s+/).slice(0, 20).join(" ");
			let result = await this.translate(text, 'auto', 'en');
			if (result.message)
				throw new Error(result.message);
			else if (!result.detected_language)
				throw new Error("Could not detect language");
			else {
				this.success();
				return [{language: result.detected_language}];
			}
		} catch (e) {
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
			const response = await fetch(`https://translate.${this.region}.amazonaws.com/TranslateText`, {
				body: JSON.stringify({
					Text: text,
					SourceLanguageCode: from,
					TargetLanguageCode: to,
				}),
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});

			// Data = {"AppliedSettings": {"Formality": "...", "Profanity": "..."},
			// 		   "AppliedTerminologies": [{"Name": "...", "Terms": [{"SourceText": "...", "TargetText": "..."}, ...]}, ...],
			// 		   "SourceLanguageCode": "en", "TargetLanguageCode": "fr", "TranslatedText": "..."}
			// }
			const data = await response.json();
			if (!response.ok)
				throw new Error(data.error.message);
			const return_values = {translation: data.TranslatedText,
				detected_language: (from === "auto" &&  data.SourceLanguageCode) ? data.SourceLanguageCode : null};
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
			const response = await fetch(`https://translate.${this.region}.amazonaws.com/ListLanguages`, {
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});

			// Data = {"DisplayLanguageCode": "en", "Languages": [{"LanguageCode": "en", "LanguageName": "English"}, ...], "NextToken": "..."}
			const data = await response.json();

			if (!response.ok)
				throw new Error(data.error.message);

			const return_values = {languages: data.Languages.map((l: { LanguageCode: any; LanguageName: any; }) => l.LanguageCode)};
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
