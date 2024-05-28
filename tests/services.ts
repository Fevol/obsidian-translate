// Add node to the global scope so that we can use it in the tests
import { existsSync, readFileSync } from 'fs';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
// @ts-ignore (TextDecoder is not defined in the Node.js global scope)
global.TextDecoder = TextDecoder;

// Add mock for SubtleCrypto
const crypto = require('crypto');
Object.defineProperty(global.self, "crypto", {
	value: Object.setPrototypeOf({ subtle: crypto.webcrypto.subtle }, crypto)
});

require('jest-fetch-mock').enableMocks()
// @ts-expect-error (fetchMock is not defined in the global scope)
fetchMock.dontMock()



export const filled_settings: TranslatorPluginSettings =
	existsSync('tests/correct-data.json') ? JSON.parse(readFileSync('tests/correct-data.json').toString()) : undefined;

import {
	AzureTranslator,
	Deepl, DummyTranslate,
	FanyiBaidu,
	FanyiQq,
	FanyiYoudao,
	GoogleTranslate, LibreTranslate, LingvaTranslate, YandexTranslate, OpenaiTranslator
} from "../src/handlers";
import type {APIServiceSettings} from "../src/types";
import type {TranslatorPluginSettings} from "../src/types";


type Constructor<T> = abstract new (...args: never[]) => T;

/** @public Test config for a Translation Service */
interface ServiceConfig {
	/** @public Constructor for Translation Service object */
	service: Constructor<DummyTranslate>,
	/** @public Display name for test output */
	name: string,
	/** @public Required inputs for the translation service */
	inputs: string[]
}


export const services: Record<string, ServiceConfig> = {
	// "amazon_translate": {
	// 	"service": AmazonTranslate,
	// 	"inputs": ["api_key", "region"],
	//  "name": "Amazon Translate"
	// },
	// "bergamot": BergamotTranslate,
	"azure_translator": {
		"service": AzureTranslator,
		"inputs": ["api_key"],
		"name": "Azure Translator"
	},
	// "dummy_translate": {
	// 	"service": DummyTranslate,
	// 	"name": "Dummy Translate"
	// },
	"deepl": {
		"service": Deepl,
		"inputs": ["api_key"],
		"name": "DeepL"
	},
	"fanyi_baidu": {
		"service": FanyiBaidu,
		"inputs": ["api_key", "app_id"],
		"name": "Fanyi Baidu"
	},
	"fanyi_qq": {
		"service": FanyiQq,
		"inputs": ["api_key", "app_id"],
		"name": "Fanyi QQ"
	},
	"fanyi_youdao": {
		"service": FanyiYoudao,
		"inputs": ["api_key", "app_id"],
		"name": "Fanyi Youdao"
	},
	// "fasttext": FastTextDetector,
	"google_translate": {
		"service": GoogleTranslate,
		"inputs": ["api_key"],
		"name": "Google Translate"
	},
	"libre_translate": {
		"service": LibreTranslate,
		"inputs": ["host"],
		"name": "Libre Translate"
	},
	"lingva_translate": {
		"service": LingvaTranslate,
		"inputs": [],
		"name": "Lingva Translate"
	},
	"yandex_translate": {
		"service": YandexTranslate,
		"inputs": ["api_key"],
		"name": "Yandex Translate"
	},
	"openai_translator": {
		"service": OpenaiTranslator,
		"inputs": ["api_key", "host"],
		"name": "OpenAI Translator"
	}
}

export const input_desc = {
	"api_key": "API key",
	"app_id": "App ID",
	"region": "Region",
	"host": "Host",
}

export const empty_settings: APIServiceSettings = {
	selected_languages: [],
	available_languages: [],

	api_key: undefined,
	app_id: undefined,
	region: undefined,
	host: undefined,

	validated: false,
	auto_translate: false,
	auto_translate_interval: 1000,
}
