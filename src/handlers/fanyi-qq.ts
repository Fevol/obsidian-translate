import {DummyTranslate} from "./dummy-translate";
import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";

export class FanyiQq extends DummyTranslate {
	api_key: string;
	app_id: string;

	constructor(api_key: string, app_id: string) {
		super();
		this.api_key = api_key;
		this.app_id = app_id;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};

		try {
			const response = await fetch(`https://tmt.tencentcloudapi.com/?` +
				new URLSearchParams({
					Action: 'LanguageDetect',
					ProjectId: '0',
					Text: 'I',
				}), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
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
			const response = await fetch(`https://tmt.tencentcloudapi.com/?` +
				new URLSearchParams({
					Action: 'LanguageDetect',
					ProjectId: this.app_id,
					Text: text,
				}), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});


			// Data = {"Response": {"Lang":"en", "RequestId": "..." } }
			const data = await response.json();
			if (!response.ok)
				throw new Error(data.Response.Error.Message);

			const return_values = [{language: data.Response.Lang}];
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

		function attempt_translation(sourceText: string, target: string): Promise<Response> {
			return fetch(`https://tmt.tencentcloudapi.com/?` +
				new URLSearchParams({
					Action: 'TextTranslate',
					ProjectId: this.app_id,
					Source: from,
					Target: target,
					SourceText: sourceText,
				}), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
			});
		}

		try {
			let response = await attempt_translation(text, to);

			// Data = {"Response": {"TargetText":"Hello", "Source":"en", "Target":"zh", "RequestId": "..." } }
			let data = await response.json();
			let detected_language = data.Response?.Source;
			if (!response.ok) {
				if (data.Response.Error.Code === 'UnsupportedOperation.UnsupportedSourceLanguage') {
					// TODO: Warn user of doubled character usage due to indirect translation via pivoting
					// Use English as the pivot language (as QQ does not support translation between all language pairs)
					response = await attempt_translation(text, 'en');
					data = await response.json();
					detected_language = data.Response?.Source;

					// If it still manages to fail, so be it
					if (!response.ok)
						throw new Error(data.Response.Error.Message);

					response = await attempt_translation(data.Response.TargetText, to);
					data = await response.json();
				} else {
					throw new Error(data.Response.Error.Message);
				}
			}
			const return_values = {translation: data.Response.TargetText,
								   detected_language: (from === "auto" &&  detected_language) ? detected_language : null};
			this.success();
			return return_values;
		} catch (e) {
			this.failed();
			return {message: `Translation failed:\n(${e.message})`};
		}
	}

	async get_languages(): Promise<LanguagesFetchResult> {
		// TODO: Figure out if QQ has an endpoint for getting the current languages
		return {languages: ["zh", "zh-TW", "en", "ja", "ko", "fr", "es", "it", "de", "tr", "ru", "pt", "vi", "id", "th", "ms", "ar", "hi"]}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
