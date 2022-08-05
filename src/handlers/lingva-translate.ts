import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class LingvaTranslate extends DummyTranslate {
	host: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.host = settings.host;
	}

	async validate(): Promise<ValidationResult> {
		if (!this.host)
			return {valid: false, message: "Host was not specified"};

		try {
			const response = await requestUrl({url: `https://${this.host}/api/v1/languages`});
			if(response.status === 200) this.success();

			return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${response.json.data.error}`};
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
			const response = await requestUrl({url: `https://${this.host}/api/v1/${from}/${to}/${text}`});
			// Data = {"translation": "...", "info": {
			// 		"detectedSource": "en",
			// 		"pronunciation": {"query": "..."},
			// 		"definition": [{"type": "...", "list": [...]}]
			//      "similar": [{"text": "..."}]
			//      "extraTranslations": [...]
			//      }
			// }
			const data = response.json;
			if (response.status !== 200)
				throw new Error(data.error);
			const return_values = {translation: data.translation,
								   detected_language: (from === "auto" &&  data.info?.detectedSource) ? data.info.detectedSource : null};
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
			const response = await requestUrl({url: `https://${this.host}/api/v1/languages`});
			// Data = {"languages": [{"code":"en", "name":"English"}, ...]}
			const data = response.json;

			if (response.status !== 200)
				throw new Error(data.error);

			const return_values = {languages: data.languages
					.filter((l: { code: any; name: any; }) => l.code !== "auto")
					.map((l: { code: any; name: any; }) => l.code.replace("_", "-"))};

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
