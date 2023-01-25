import {DummyTranslate} from "./dummy-translate";
import type {
	ServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult,
	ServiceOptions
} from "./types";
import {requestUrl} from "obsidian";

export class LingvaTranslate extends DummyTranslate {
	#host: string;
	id = "lingva_translate";

	character_limit = 7500;

	constructor(settings: ServiceSettings) {
		super();
		this.#host = settings.host;
	}

	update_settings(settings: ServiceSettings): void {
		this.#host = settings.host ?? this.#host;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.#host)
			return {status_code: 400, valid: false, message: "Host was not specified"};

		const response = await requestUrl({
			throw: false,
			url: `https://${this.#host}/api/v1/languages`
		});
		const data = response.json;

		return {
			status_code: response.status,
			valid: response.status === 200,
			message: data.error
		};
	}


	async service_detect(text: string): Promise<DetectionResult> {
		let result: any = await this.service_translate(text, 'auto', 'en');
		result.detected_languages = [{language: result.detected_language}];
		return result;
	}

	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
		const response = await requestUrl({
			throw: false,
			url: `https://${this.#host}/api/v1/${from}/${to}/${text}`
		});

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
			return {status_code: response.status, message: data.error};

		return {
			status_code: response.status,
			translation: data.translation,
			detected_language: (from === "auto" && data.info?.detectedSource) ? data.info.detectedSource : null
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			url: `https://${this.#host}/api/v1/languages`
		});
		// Data = {"languages": [{"code":"en", "name":"English"}, ...]}
		const data = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.error};

		return {
			status_code: response.status,
			languages: response.status !== 200 ? undefined :
				data.languages
					.filter((l: { code: any; name: any; }) => l.code !== "auto")
					.map((l: { code: any; name: any; }) => l.code.replace("_", "-"))
		};
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
