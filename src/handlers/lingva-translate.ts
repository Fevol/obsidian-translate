import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class LingvaTranslate extends DummyTranslate {
	host: string;

	character_limit = 7500;

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


	async service_detect(text: string): Promise<DetectionResult> {
		let result: any = await this.service_translate(text, 'auto', 'en');
		result.detected_languages = [{language: result.detected_language}];
		return result;
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
