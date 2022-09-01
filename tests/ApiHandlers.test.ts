import {AmazonTranslate, BergamotTranslate, BingTranslator, DummyTranslate, Deepl, FanyiBaidu, FanyiQq,
		FanyiYoudao, FastTextDetector, GoogleTranslate, LibreTranslate, LingvaTranslate, YandexTranslate} from "handlers";
import type {APIServiceSettings, LanguageModelData} from "../src/types";


const services = {
	// "Amazon Translate": {
	// 	"service": AmazonTranslate,
	// 	"inputs": ["api_key", "region"],
	// },
	// "Bergamot": BergamotTranslate,
	"Bing Translator": {
		"service": BingTranslator,
		"inputs": ["api_key", "region"],
	},
	// "Dummy Translate": {
	// 	"service": DummyTranslate
	// },
	// "DeepL": {
	// 	"service": Deepl,
	// 	"inputs": ["api_key", "host"],
	// },
	// "Fanyi Baidu": {
	// 	"service": FanyiBaidu,
	// 	"inputs": ["api_key", "app_id"],
	// },
	// "Fanyi QQ": {
	// 	"service": FanyiQq,
	// 	"inputs": ["api_key", "app_id", "region"],
	// },
	// "Fanyi Youdao": {
	// 	"service": FanyiYoudao,
	// 	"inputs": ["api_key", "app_id"],
	// },
	// // "FastText": FastTextDetector,
	// "Google Translate": {
	// 	"service": GoogleTranslate,
	// 	"inputs": ["api_key"],
	// },
	// "Libre Translate": {
	// 	"service": LibreTranslate,
	// 	"inputs": ["host"],
	// },
	// "Lingva Translate": {
	// 	"service": LingvaTranslate,
	// },
	// "Yandex Translate": {
	// 	"service": YandexTranslate,
	// 	"inputs": ["api_key"],
	// }
}

const input_desc = {
	"api_key": "API key",
	"app_id": "App ID",
	"region": "Region",
	"host": "Host",
}

const empty_settings: APIServiceSettings = {
	selected_languages: [],
	available_languages: [],

	api_key: "",
	app_id: "",
	region: "",
	host: "",

	validated: false,
	auto_translate: false,
	auto_translate_interval: 1000,
}

//@ts-ignore
const filled_settings: APIServiceSettings = {};

for (const [name, config] of Object.entries(services)) {
	describe(name, async () => {
		const translator: DummyTranslate = new config.service(empty_settings);

		for (const input of config?.inputs) {
			//@ts-ignore
			test(`validate (${input} unset)`, async () => {
				const result = await translator.validate();
				expect(result.valid).toBe(true);
				//@ts-ignore
				expect(result.message).toBe(input_desc[input] + " was not specified");
			});
			//@ts-ignore
			translator[input] = "wrong-value";
		}

		test("validate (wrong values)", async () => {
			const result = await translator.validate();
			expect(result.valid).toBe(false);
			expect(result.message).toContain("Validation failed:\n");
		});




	})
}
