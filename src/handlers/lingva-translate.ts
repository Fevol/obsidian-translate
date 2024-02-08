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


interface LingvaBaseResult {
	error?: string
}

interface LingvaTranslationResult extends LingvaBaseResult {
	translation: string
	info?: {
		detectedSource: string
		pronunciation: {query: string}
		definition: {type: string, list: string[]}[]
		similar: {text: string}[]
		extraTranslations: string[]
	}
}

interface LingvaLanguageResult extends LingvaBaseResult {
	languages: Array<{code: string, name: string}>
}


export class LingvaTranslate extends DummyTranslate {
	#host?: string;
	id = "lingva_translate";

	character_limit = 7500;

	constructor(settings: ServiceSettings) {
		super();
		this.#host = settings.host;
		if (this.#host && !this.#host.startsWith("http"))
			this.#host = `https://${this.#host}`;
	}

	update_settings(settings: ServiceSettings): void {
		this.#host = settings.host ?? this.#host;
		if (!this.#host!.startsWith("http"))
			this.#host = `https://${this.#host}`;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.#host)
			return {status_code: 400, valid: false, message: "Host was not specified"};

		const response = await requestUrl({
			throw: false,
			url: `${this.#host}/api/v1/languages`
		});
		const data: LingvaLanguageResult = response.json;

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
			url: `${this.#host}/api/v1/${from}/${to}/${encodeURIComponent(text)}`
		});

		// Data = {"translation": "...", "info": {
		// 		"detectedSource": "en",
		// 		"pronunciation": {"query": "..."},
		// 		"definition": [{"type": "...", "list": [...]}]
		//      "similar": [{"text": "..."}]
		//      "extraTranslations": [...]
		//      }
		// }
		const data: LingvaTranslationResult = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.error};

		return {
			status_code: response.status,
			translation: data.translation,
			detected_language: (from === "auto" && data.info?.detectedSource) ? data.info.detectedSource : undefined
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			url: `${this.#host}/api/v1/languages`
		});
		// Data = {"languages": [{"code":"en", "name":"English"}, ...]}
		const data: LingvaLanguageResult = response.json;
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
