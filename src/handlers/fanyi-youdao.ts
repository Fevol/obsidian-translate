import {DummyTranslate} from "./dummy-translate";
import type {ServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "./types";
import {requestUrl} from "obsidian";
import {DEFAULT_SETTINGS} from "../constants";

export class FanyiYoudao extends DummyTranslate {
	api_key: string;
	app_id: string;
	id = "fanyi_youdao";

	character_limit = 5000;

	status_code_lookup: {[key: number]: {message: string, status_code: number}} = {
		0:   {message: undefined, status_code: 200},
		101: {message: "Missing required parameter", status_code: 400},
		102: {message: "Unsupported language type", status_code: 400},
		103: {message: "Translated text is too long", status_code: 400},
		104: {message: "Unsupported API type", status_code: 400},
		105: {message: "Unsupported signature type", status_code: 400},
		106: {message: "Unsupported response type", status_code: 400},
		107: {message: "Unsupported transport encryption type", status_code: 400},
		108: {message: "Invalid app ID", status_code: 401},
		110: {message: "No application of related service", status_code: 401},
		111: {message: "Invalid developer account", status_code: 401},
		112: {message: "Invalid request service", status_code: 401},
		113: {message: "Query may not be empty", status_code: 400},
		201: {message: "Decryption failed (DES/BASE64/URLDecode error)", status_code: 400},
		202: {message: "Signature verification failed, possibly query encoding error", status_code: 400},
		203: {message: "Access IP is not in list of accessible IPs", status_code: 401},
		205: {message: "Requested interface inconsistent with platform type of application", status_code: 401},
		206: {message: "Signature verification failed due to invalid timestamp", status_code: 400},
		301: {message: "Dictionary lookup failed", status_code: 500},
		302: {message: "Translation query failed", status_code: 500},
		303: {message: "Unknown error server-side", status_code: 500},
		304: {message: "Session idle for too long, timed out", status_code: 408},
		309: {message: "Domain parameter error", status_code: 400},
		401: {message: "Insufficient account balance", status_code: 402},
		402: {message: "Offlinesdk is not available", status_code: 400},
		411: {message: "Access frequency is too high, please try again later", status_code: 429},
		412: {message: "Too many big requests, please try again later", status_code: 429},
		1411:{message: "Access frequency limited", status_code: 429},
	};

	constructor(settings: ServiceSettings) {
		super();
		this.api_key = settings.api_key;
		this.app_id = settings.app_id;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {status_code: 400, valid: false, message: "API key was not specified"};
		if (!this.app_id)
			return {status_code: 400, valid: false, message: "App ID was not specified"};

		const signed_message = await this.sign_message('I');
		const response = await requestUrl({
			throw: false,
			url: `https://openapi.youdao.com/api?` +
				new URLSearchParams({
					q: 'I',
					appKey: this.app_id,
					salt: signed_message.salt,
					from: 'en',
					to: 'en',
					sign: signed_message.signature,
					signType: "v3",
					curtime: signed_message.current_time,
					vocabId: "",
				}),
			method: "POST"
		});

		const data = response.json;

		if (response.status !== 200)
			return {status_code: response.status, valid: false};

		const output = this.status_code_lookup[parseInt(data.errorCode)];
		if (output) {
			return {...output, valid: output.status_code === 200};
		} else {
			return {status_code: data.errorCode, valid: false};
		}
	}


	async service_detect(text: string): Promise<DetectionResult> {
		let result: any = await this.service_translate(text, 'auto', 'en');
		result.detected_languages = [{language: result.detected_language}];
		return result;
	}

	async sign_message(message: string) {
		function truncate(text: string) {
			const len = text.length;
			if (len <= 20)
				return text;
			return text.substring(0, 10) + len + text.substring(len - 10, len);
		}

		const salt = (new Date).getTime();
		const current_time = Math.round(new Date().getTime()/1000);

		// The implementation of the hashing is taken from 'https://github.com/luhaifeng666/obsidian-translator"
		const hashMessage = this.app_id + truncate(message) + salt + current_time + this.api_key;
		const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashMessage))
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

		return {
			salt: salt.toString(),
			text: message,
			signature: signature,
			current_time: current_time.toString(),
		}
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		const signed_message = await this.sign_message(text);
		const response = await requestUrl({
			throw: false,
			url: `https://openapi.youdao.com/api?` +
				new URLSearchParams({
					q: text,
					appKey: this.app_id,
					salt: signed_message.salt,
					from: from,
					to: to,
					sign: signed_message.signature,
					signType: "v3",
					curtime: signed_message.current_time,
					vocabId: "",
				}),
			method: "POST"
		});


		// Data = {"errorCode":"0", "query":"good", "translation":["好"],
		// 			"basic":{"us-phonetic":"good", "phonetic":"good", "uk-phonetic":"good", "explains":["好"]},
		// 			"web":[{"key":"good", "value":["好"]}]}
		const data = response.json;

		const output = this.status_code_lookup[parseInt(data.errorCode)];
		if (output) {
			if (output.status_code === 200) {
				return {
					...output,
					translation: data.translation.join('\n'),
					detected_language: from === 'auto' ? data.l.split("2")[0].toLowerCase() : undefined,
				}
			} else {
				return {...output};
			}
		} else {
			return {status_code: data.errorCode};
		}
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		// TODO: Figure out if Youdao has an endpoint for getting the current languages
		return {
			status_code: 200,
			languages: DEFAULT_SETTINGS.service_settings.fanyi_youdao.available_languages
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
