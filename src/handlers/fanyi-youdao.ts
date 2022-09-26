import {DummyTranslate} from "./dummy-translate";
import type {APIServiceSettings, DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {requestUrl} from "obsidian";

export class FanyiYoudao extends DummyTranslate {
	api_key: string;
	app_id: string;

	character_limit = 5000;

	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
		this.app_id = settings.app_id;
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {valid: false, message: "API key was not specified"};
		if (!this.app_id)
			return {valid: false, message: "App ID was not specified"};

		const signed_message = await this.sign_message('I');
		const response = await requestUrl({url: `https://openapi.youdao.com/api?` +
			new URLSearchParams({
				q: 'I',
				appKey: this.app_id,
				salt: signed_message.salt,
				from: 'en',
				to: 'en',
				sign: signed_message.signature,
				signtype: "v3",
				curtime: signed_message.current_time,
				vocabId: "",
			}), method: "POST"});

		const data = response.json;

		return {valid: !data.errorCode, message: !data.errorCode ? "" : `Validation failed:\n${data.errorCode}`};
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
		message = truncate(message);

		// The implementation of the hashing is taken from 'https://github.com/luhaifeng666/obsidian-translator"
		const hashMessage = this.app_id + message + salt + current_time + this.api_key;
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
		const response = await requestUrl({url: `https://openapi.youdao.com/api?` +
			new URLSearchParams({
				q: text,
				appKey: this.app_id,
				salt: signed_message.salt,
				from: from,
				to: to,
				sign: signed_message.signature,
				signtype: "v3",
				curtime: signed_message.current_time,
				vocabId: "",
			}), method: "POST"});


		// Data = {"errorCode":"0", "query":"good", "translation":["好"],
		// 			"basic":{"us-phonetic":"good", "phonetic":"good", "uk-phonetic":"good", "explains":["好"]},
		// 			"web":[{"key":"good", "value":["好"]}]}
		const data = response.json;

		if (data.errorCode)
			throw new Error(data.errorCode);

		let detected_language = null;
		if (from === 'auto')
			detected_language = data.l.split("2")[0].toLowerCase();

		return {translation: data.translation.join('\n'), detected_language: detected_language};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		// TODO: Figure out if Youdao has an endpoint for getting the current languages
		return {
			languages: [
				"af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "ceb", "co", "cs", "cy", "da", "de", "el", "en",
				"eo", "es", "et", "eu", "fa", "fi", "fj", "fr", "fy", "ga", "gd", "gl", "gu", "ha", "haw", "he", "hi",
				"hr", "ht", "hu", "hy", "id", "ig", "is", "it", "ja", "jw", "ka", "kk", "km", "kn", "ko", "ku", "ky",
				"la", "lb", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "mww", "my", "ne", "nl",
				"no", "ny", "otq", "pa", "pl", "ps", "pt", "ro", "ru", "sd", "si", "sk", "sl", "sm", "sn", "so", "sq",
				"sr-Cyrl", "sr-Latn", "st", "su", "sv", "sw", "ta", "te", "tg", "th", "tl", "tlh", "to", "tr", "ty",
				"uk", "ur", "uz", "vi", "xh", "yi", "yo", "yua", "yue", "zh-CHS", "zh-CHT", "zu"
			]
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
