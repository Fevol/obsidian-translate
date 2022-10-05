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
import {toSentenceCase} from "../util";

export class FanyiBaidu extends DummyTranslate {
	api_key: string;
	app_id: string;

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
			detected_languages: [{language: data.src}]
		};
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		const signature = await this.sign_message(text);

		const payload = {
			q: text,
			from: from,
			to: to,
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
			detected_language: (from === "auto" &&  data.to) ? data.to : null
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		return {languages:
			[
				'ach', 'afr', 'aka', 'alb', 'amh', 'ara', 'arg', 'arm', 'arq', 'asm', 'ast', 'aym', 'aze', 'bak', 'bal',
				'baq', 'bel', 'bem', 'ben', 'ber', 'bho', 'bis', 'bli', 'bos', 'bre', 'bul', 'bur', 'cat', 'ceb', 'chr',
				'cht', 'chv', 'cor', 'cos', 'cre', 'cri', 'cs', 'dan', 'de', 'div', 'el', 'en', 'eno', 'epo', 'est',
				'fao', 'fil', 'fin', 'fra', 'fri', 'frm', 'frn', 'fry', 'ful', 'geo', 'gla', 'gle', 'glg', 'glv', 'gra',
				'grn', 'guj', 'hak', 'hau', 'haw', 'heb', 'hi', 'hil', 'hkm', 'hmn', 'hrv', 'ht', 'hu', 'hup', 'ibo',
				'ice', 'id', 'ido', 'iku', 'ina', 'ing', 'ir', 'it', 'jav', 'jp', 'kab', 'kah', 'kal', 'kan', 'kas',
				'kau', 'kin', 'kir', 'kli', 'kok', 'kon', 'kor', 'kur', 'lag', 'lao', 'lat', 'lav', 'lim', 'lin', 'lit',
				'log', 'loj', 'los', 'ltz', 'lug', 'mac', 'mah', 'mai', 'mal', 'mao', 'mar', 'mau', 'may', 'mg', 'mlt',
				'mot', 'nbl', 'nea', 'nep', 'nl', 'nno', 'nob', 'nor', 'nqo', 'nya', 'oci', 'oji', 'ori', 'orm', 'oss',
				'pam', 'pan', 'pap', 'ped', 'per', 'pl', 'pot', 'pt', 'pus', 'que', 'ro', 'roh', 'rom', 'ru', 'ruy',
				'san', 'sec', 'sha', 'sil', 'sin', 'sk', 'slo', 'sm', 'sme', 'sna', 'snd', 'sol', 'som', 'sot', 'spa',
				'src', 'srd', 'srp', 'sun', 'swa', 'swe', 'syr', 'tam', 'tat', 'tel', 'tet', 'tgk', 'tgl', 'th', 'tir',
				'tr', 'tso', 'tua', 'tuk', 'twi', 'ukr', 'ups', 'urd', 'ven', 'vie', 'wel', 'wln', 'wol', 'wyw', 'xho',
				'yid', 'yor', 'yue', 'zaz', 'zh', 'zul'
			]
		}
	}

	has_autodetect_capability(): boolean {
		return true;
	}
}
