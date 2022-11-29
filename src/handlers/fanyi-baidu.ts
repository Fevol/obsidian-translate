import {DummyTranslate} from "./dummy-translate";
import type {
	APIServiceSettings,
	DetectionResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult
} from "../types";
import {MD5} from "./md5";

import {requestUrl} from "obsidian";
import {iso639_3to1, iso639_1to3} from "../util";

export class FanyiBaidu extends DummyTranslate {
	api_key: string;
	app_id: string;
	id = "fanyi_baidu";

	character_limit = 6000;

	constructor(settings: APIServiceSettings) {
		super();
		this.api_key = settings.api_key;
		this.app_id = settings.app_id;
	}

	async sign_message(text: any) {
		const salt = Date.now().toString();
		const signature_text = `${this.app_id}${text}${salt}${this.api_key}`;
		const signature = MD5(signature_text);
		return {
			signature: signature,
			salt: salt,
		}
	}

	async service_validate(): Promise<ValidationResult> {
		if (!this.api_key)
			return {status_code: 400, valid: false, message: "API key was not specified"};
		if (!this.app_id)
			return {status_code: 400, valid: false, message: "App ID was not specified"};

		const signature = await this.sign_message('I');
		const payload = {
			q: 'I',
			appid: this.app_id,
			salt: signature.salt,
			sign: signature.signature,
		}

		const response = await requestUrl({
			throw: false,
			url: `http://api.fanyi.baidu.com/api/trans/vip/language/?` + new URLSearchParams(payload),
			method: 'POST',
			headers: { 'Content-Type': 'application/json', }
		});

		const data = response.json;
		const status_code = data.error_code ? parseInt(data.error_code) : response.status;

		return {
			status_code: status_code,
			valid: status_code === 200,
			message: data.error_msg,
		};
	}


	async service_detect(text: string): Promise<DetectionResult> {
		const signature = await this.sign_message(text);
		const payload = {
			q: text,
			appid: this.app_id,
			salt: signature.salt,
			sign: signature.signature,
		}

		const response = await requestUrl({
			throw: false,
			url: `http://api.fanyi.baidu.com/api/trans/vip/language/?` + new URLSearchParams(payload),
			method: 'POST',
			headers: { 'Content-Type': 'application/json', }
		});

		// Data = {"data":{"src": "en"} }
		const data = response.json;
		const status_code = data.error_code ? parseInt(data.error_code) : response.status;

		if (status_code !== 200)
			return {status_code: status_code, message: data.error_msg}

		return {
			status_code: response.status,
			detected_languages: [{language: iso639_3to1[data.src] || data.src}]
		};
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		const signature = await this.sign_message(text);

		const payload = {
			q: text,
			from: from,
			to: iso639_1to3[to] || to,
			appid: this.app_id,
			salt: signature.salt,
			sign: signature.signature,
		}

		const response = await requestUrl({
			throw: false,
			url: `http://api.fanyi.baidu.com/api/trans/vip/translate/?` + new URLSearchParams(payload),
			method: 'POST',
			headers: { 'Content-Type': 'application/json', }
		});

		// Data = {"from":"en", "to":"zh", "trans_result":[{"src": "Hello", "dst": "你好"}] }
		let data = response.json;
		const status_code = data.error_code ? parseInt(data.error_code) : response.status;
		if (status_code !== 200)
			return {status_code: status_code, message: data.error_msg}


		return {
			status_code: response.status,
			translation: data.trans_result[0].dst,
			detected_language: (from === "auto" &&  data.to) ? (iso639_3to1[data.to] || data.to) : null
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		return {languages:
				[
					"ach", "af", "ak", "am", "an", "ar", "arq", "as", "ast", "ay", "az", "ba", "bal", "be", "bem", "ber",
					"bg", "bho", "bi", "bli", "bn", "br", "bs", "ca", "ceb", "chr", "cht", "co", "cr", "cri", "cs", "cv",
					"da", "de", "dv", "el", "en", "eno", "eo", "es", "et", "eu", "fa", "fa", "ff", "fi", "fil", "fo",
					"fr", "fr-CA", "frm", "fur", "fy", "ga", "gd", "gl", "gn", "gra", "gu", "gv", "ha", "hak", "haw",
					"he", "hi", "hil", "hr", "ht", "hu", "hup", "hy", "ia", "id", "ig", "ing", "io", "is", "it", "iu",
					"ja", "ka", "kab", "kah", "kg", "kli", "km", "kn", "ko", "kok", "kr", "ks", "ku", "kw", "ky", "la",
					"lag", "lb", "lg", "li", "ln", "lo", "log", "loj", "los", "lt", "lv", "lzh", "mai", "mau", "mg",
					"mh", "mi", "mk", "ml", "mot", "mr", "ms", "mt", "my", "nb", "ne", "nea", "nl", "nn", "no", "nqo",
					"nr", "ny", "oc", "oj", "om", "or", "os", "pa", "pam", "pap", "ped", "pl", "pot", "ps", "pt", "qu",
					"rm", "ro", "rom", "ru", "ruy", "rw", "sa", "sc", "sd", "se", "sec", "sha", "si", "sil", "sk", "sk",
					"sm", "sn", "so", "sol", "sq", "sr", "src", "st", "su", "sv", "sw", "syr", "ta", "te", "tet", "tg",
					"th", "ti", "tk", "tl", "tr", "ts", "tt", "tua", "tw", "uk", "ur", "ve", "vi", "wa", "wen", "wo",
					"xh", "yi", "yo", "yue", "zh", "zu"
				]
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
