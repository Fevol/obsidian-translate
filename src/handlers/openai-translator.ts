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
import {ALL_TRANSLATOR_LANGUAGES} from "../constants";

export class OpenaiTranslator extends DummyTranslate {
	#host?: string;
	#api_key?: string;
	id = "openai_translator";
	model? = "gpt-3.5-turbo"
	temperature = 0.3;

	requires_api_key = false;

	constructor(settings: ServiceSettings) {
		super();
		this.#api_key = settings.api_key;
		this.#host = settings.host;
		this.model = settings.model;
		if (this.#host)
			this.#host = !this.#host.startsWith("http") ? `https://${this.#host}` : new URL(this.#host).origin;
	}

	update_settings(settings: ServiceSettings): void {
		this.#api_key = settings.api_key ?? this.#api_key;
		this.#host = settings.host ?? this.#host;
		this.model = settings.model ?? "gpt-3.5-turbo";
		if (this.#host)
			this.#host = !this.#host.startsWith("http") ? `https://${this.#host}` : new URL(this.#host).origin;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.#host)
			return {status_code: 400, valid: false, message: "Host was not specified"};

		if (this.#api_key === null)
			return {status_code: 400, valid: false, message: "API key was not specified"};

		// Error type is sadly not shared across multiple host instances, so full request will have to be tested
		// TODO: Map custom domains

		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `${this.#host}/v1/chat/completions`,
			body: JSON.stringify({
				"model": this.model,
				"messages": [
					// Token cost: 10
					{ "role": "user", "content": "Say I" },
				],
				"temperature": this.temperature,
			}),
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.#api_key}`
			}
		});


		if (response.status !== 200) {
			const data = response.json;
			if (data.error)
				return {status_code: response.status, valid: false, message: data.error.message};
			else
				return {status_code: response.status, valid: false, message: "Invalid API key or host"};
		}

		return {status_code: response.status, valid: true};
	}

	async service_detect(text: string): Promise<DetectionResult> {
		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `${this.#host}/v1/chat/completions`,
			body: JSON.stringify({
				"model": this.model,
				"messages": [
					{ "role": "user", "content": "Identify the language of the input, please ONLY output its ISO639-1 code:" + "\n" + text },
				],
				"temperature": this.temperature,
			}),
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.#api_key}`
			}
		});


		const data = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.error.message}

		return {
			status_code: response.status,
			detected_languages: response.status === 200 ? [{
				language: data.choices[0].message['content'].toLowerCase(),
				confidence: 1
			}] : undefined
		};
	}

	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
		let prompt;
		if (from === "auto")
			prompt = `Translate following text to '${to}' without explanation, include ISO639-1 locale of the input in the first line:`;
		else
			prompt = `Translate following text from '${from}' to '${to}' without explanation:`;

		const response = await requestUrl({
			throw: false,
			method: "POST",
			url: `${this.#host}/v1/chat/completions`,
			body: JSON.stringify({
				"model": this.model,
				"messages": [
					{ "role": "user", "content": prompt + "\n" + text },
				],
				"temperature": this.temperature,
			}),
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.#api_key}`
			}
		});

		const data = response.json;
		if (response.status !== 200)
			return {status_code: response.status, message: data.error.message}

		const output = data.choices[0].message['content'];

		if (from === "auto") {
			const first_newline = output.indexOf("\n");
			if (first_newline === -1) {
				return {
					status_code: response.status,
					translation: output,
					detected_language: "Detection failed"
				}
			} else {
				return {
					status_code: response.status,
					translation: output.substring(first_newline + 1).trimStart(),
					detected_language: output.substring(0, first_newline).toLowerCase()
				}
			}
		} else {
			return {
				status_code: response.status,
				translation: output
			}
		}
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		return {
			status_code: 200,
			languages: ALL_TRANSLATOR_LANGUAGES
		};
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
