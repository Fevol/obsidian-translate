import { requestUrl } from "obsidian";
import { DummyTranslate } from "./dummy-translate";
import type {
	DetectionResult,
	LanguagesFetchResult,
	ServiceOptions,
	ServiceSettings,
	TranslationResult,
	ValidationResult,
} from "./types";

interface LingvaBaseResult {
	error?: string;
}

interface LingvaTranslationResult extends LingvaBaseResult {
	translation: string;
	info?: {
		detectedSource: string;
		pronunciation: { query: string };
		definition: { type: string; list: string[] }[];
		similar: { text: string }[];
		extraTranslations: string[];
	};
}

interface LingvaLanguageResult extends LingvaBaseResult {
	languages: Array<{ code: string; name: string }>;
}

export class LingvaTranslate extends DummyTranslate {
	#host?: string;
	id = "lingva_translate";

	byte_limit = 2500;

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
			return { status_code: 400, valid: false, message: "Host was not specified" };

		const response = await requestUrl({
			throw: false,
			url: `${this.#host}/api/v1/languages`,
		});
		const data: LingvaLanguageResult = response.json;

		return {
			status_code: response.status,
			valid: response.status === 200,
			message: data.error,
		};
	}

	async service_detect(text: string): Promise<DetectionResult> {
		const result = await this.service_translate(text, "auto", "en");
		return {
			...result,
			detected_languages: [{ language: result.detected_language }],
		};
	}

	async service_translate(
		text: string,
		from: string,
		to: string,
		options: ServiceOptions = {},
	): Promise<TranslationResult> {
		const response = await requestUrl({
			throw: false,
			url: `${this.#host}/api/v1/${from}/${to}/${encodeURIComponent(text)}`,
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
			return { status_code: response.status, message: data.error };

		return {
			status_code: response.status,
			translation: data.translation,
			detected_language: (from === "auto" && data.info?.detectedSource) ? data.info.detectedSource : undefined,
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({
			throw: false,
			url: `${this.#host}/api/v1/languages`,
		});
		// Data = {"languages": [{"code":"en", "name":"English"}, ...]}
		const data: LingvaLanguageResult = response.json;
		if (response.status !== 200)
			return { status_code: response.status, message: data.error };

		return {
			status_code: response.status,
			languages: response.status !== 200 ?
				undefined :
				data.languages
					.filter((l) => l.code !== "auto")
					.map((l) => l.code.replace("_", "-")),
		};
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
