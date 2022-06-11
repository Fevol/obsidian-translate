import {DummyTranslate} from "./dummy-translate";

// FIXME: Check what translate returns when no language_from was specified

export class YandexTranslate extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate(): Promise<Object> {
		if (!this.api_key)
			return [false, "API key was not specified"];

		try {
			const result = await fetch("https://translate.yandex.net/api/v1.5/tr.json/getLangs?", {
				method: "POST",
				body: JSON.stringify({
					key: this.api_key,
					ui: "en"
				}),
				headers: {
					"Content-Type": "application/json"
				}
			});
			return [result.ok, ""];
		} catch (e) {
			return [false, e.message];
		}
	}


	async detect(text: string): Promise<string> {
		const result = await fetch("https://translate.yandex.net/api/v1.5/tr.json/detect?", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				text: text
			}),
			headers: {
				"Content-Type": "application/json"
			}
		});
		const data = await result.json();
		// Data = {code: 200, lang: "en"}
		return data.lang;
	}

	async translate(text: string, from: string, to: string): Promise<Object> {
		const result = await fetch("https://translate.yandex.net/api/v1.5/tr.json/translate?", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				text: text,
				lang: from === 'auto' ? to : `${from}-${to}`,
				format: "plain"
			}),
		});
		const data = await result.json();
		// Data = {code: 200, lang: "ru-en", text: ["Good day comrade!"]}

		if (from === 'auto')
			return {translation: data.text[0], detected_language: data.lang};
		else
			return {translation: data.text[0]};
	}

	async get_languages(): Promise<string[]> {
		const result = await fetch("https://translate.yandex.net/api/v1.5/tr.json/getLangs?", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				// Display language for format code, can be discarded
				ui: "en"
			}),
			headers: {
				"Content-Type": "application/json"
			}
		});
		const data = await result.json();
		// Data = {langs: {en: "English", ...}}
		return Object.keys(data.langs);
	}

}
