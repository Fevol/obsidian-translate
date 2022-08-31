import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class LingvaTranslate extends DummyTranslate {
	host: string;

	constructor(settings: APIServiceSettings) {
		super();
		this.host = settings.host;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.host)
			return {valid: false, message: "Host was not specified"};

		const response = await requestUrl({url: `https://${this.host}/api/v1/languages`});

		return {valid: response.status === 200, message: response.status === 200 ? "" : `Validation failed:\n${response.json.data.error}`};
	}


	async service_detect(text: string): Promise<Array<DetectionResult>> {
		// Get first 20 words of text, not all words need to be included to get proper detection
		const words = text.split(/\s+/).slice(0, 20).join(" ");
		let result = await this.service_translate(text, 'auto', 'en');
		if (result.message)
			throw new Error(result.message);
		else {
			return [{language: result.detected_language}];
		}
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
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

		return {translation: data.translation,
			    detected_language: (from === "auto" &&  data.info?.detectedSource) ? data.info.detectedSource : null};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({url: `https://${this.host}/api/v1/languages`});
		// Data = {"languages": [{"code":"en", "name":"English"}, ...]}
		const data = response.json;

		if (response.status !== 200)
			throw new Error(data.error);

		return {
			languages: data.languages
				.filter((l: { code: any; name: any; }) => l.code !== "auto")
				.map((l: { code: any; name: any; }) => l.code.replace("_", "-"))};
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
