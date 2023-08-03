import {DummyTranslate} from "./dummy-translate";
import type {
	ServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult,
	ServiceOptions
} from "./types";
import {MD5} from "./md5";

import {requestUrl} from "obsidian";
import {iso639_3to1, iso639_1to3} from "../util";
import {DEFAULT_SETTINGS, SERVICES_INFO} from "../constants";

export class FanyiBaidu extends DummyTranslate {
	#api_key: string;
	#app_id: string;
	id = "fanyi_baidu";

	character_limit = 6000;

	premium = false;

	status_code_lookup: {[key: number]: {message: string, status_code: number}} = {
		52000: {message: undefined, status_code: 200},
		52001: {message: "Request timed out, please try again later", status_code: 408},
		52002: {message: "System error, please try again later", status_code: 500},
		52003: {message: "Unauthorized user, check credentials", status_code: 401},
		54000: {message: "Required parameter is missing [OPEN ISSUE ON GITHUB]", status_code: 400},
		54001: {message: "Invalid signature [OPEN ISSUE ON GITHUB]", status_code: 400},
		54003: {message: "Too many requests, please try again later", status_code: 429},
		54004: {message: "Insufficient balance, please check your account", status_code: 402},
		54005: {message: "Frequent long queries, please try again later", status_code: 429},
		58000: {message: "Client IP is not whitelisted", status_code: 403},
		58001: {message: "Target language is not supported", status_code: 400},
		58002: {message: "Service unavailable, please try again later", status_code: 503},
		90107: {message: "Certification failed/invalid, please check certification", status_code: 401},
	}

	constructor(settings: ServiceSettings) {
		super();
		this.#api_key = settings.api_key;
		this.#app_id = settings.app_id;
	}

	update_settings(settings: ServiceSettings): void {
		this.#api_key = settings.api_key ?? this.#api_key;
		this.#app_id = settings.app_id ?? this.#app_id;
	}


	async sign_message(text: any) {
		const salt = Date.now().toString();
		const signature_text = `${this.#app_id}${text}${salt}${this.#api_key}`;
		const signature = MD5(signature_text);
		return {
			signature: signature,
			salt: salt,
		}
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.#api_key)
			return {status_code: 400, valid: false, message: "API key was not specified"};
		if (!this.#app_id)
			return {status_code: 400, valid: false, message: "App ID was not specified"};

		const signature = await this.sign_message('I');
		const payload = {
			q: 'I',
			from: 'en',
			to: 'zh',
			appid: this.#app_id,
			salt: signature.salt,
			sign: signature.signature,
		}

		const response = await requestUrl({
			throw: false,
			url: `http://api.fanyi.baidu.com/api/trans/vip/translate/?` + new URLSearchParams(payload),
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', }
		});

		const data = response.json;

		if (response.status !== 200)
			return {status_code: response.status, valid: false};

		// TODO: It is not clear whether output of request will always contain an error_code (since 52000 error_code is equal to 200)
		// Making the assumption that baidu will never return HTTP status codes other than 200
		if (data.error_code) {
			const output = this.status_code_lookup[parseInt(data.error_code)];
			if (output.status_code !== 200)
				return {valid: false, ...(output || {status_code: data.error_code, message: data.error_msg})};
		}


		// Determine whether user is a premium user
		const output = await this.service_translate("I", "en", "sq");
		this.premium = output.status_code === 200;


		return {status_code: 200, valid: true, premium: this.premium};
	}


	async service_detect(text: string): Promise<DetectionResult> {
		const signature = await this.sign_message(text);
		const payload = {
			q: text,
			appid: this.#app_id,
			salt: signature.salt,
			sign: signature.signature,
		}

		const response = await requestUrl({
			throw: false,
			url: `http://api.fanyi.baidu.com/api/trans/vip/language/?` + new URLSearchParams(payload),
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', }
		});

		// Data = {"data":{"src": "en"} }
		const data = response.json;

		if (data.error_code) {
			const output = this.status_code_lookup[parseInt(data.error_code)];
			if (output.status_code !== 200)
				return output || {status_code: data.error_code, message: data.error_msg};
		}

		return {
			status_code: 200,
			detected_languages: [{language: iso639_3to1[data.src] || data.src}]
		};
	}

	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
		const signature = await this.sign_message(text);
		const payload = {
			q: text,
			from: from,
			to: iso639_1to3[to] || to,
			appid: this.#app_id,
			salt: signature.salt,
			sign: signature.signature,
		}

		const response = await requestUrl({
			throw: false,
			url: `http://api.fanyi.baidu.com/api/trans/vip/translate/?` + new URLSearchParams(payload),
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', }
		});

		// Data = {"from":"en", "to":"zh", "trans_result":[{"src": "Hello", "dst": "你好"}] }
		let data = response.json;

		if (data.error_code) {
			const output = this.status_code_lookup[parseInt(data.error_code)];
			if (output.status_code !== 200)
				return output || {status_code: data.error_code, message: data.error_msg};
		}

		return {
			status_code: 200,
			translation: data.trans_result[0].dst,
			detected_language: (from === "auto" &&  data.to) ? (iso639_3to1[data.to] || data.to) : null
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		return {
			status_code: 200,
			languages: this.premium ? DEFAULT_SETTINGS.service_settings.fanyi_baidu.available_languages
									: SERVICES_INFO["fanyi_baidu"].standard_languages
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
