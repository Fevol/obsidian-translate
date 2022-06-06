import {DummyTranslate} from "./dummy-translate";

export class YandexTranslate extends DummyTranslate {
	constructor() {
		super();
	}

	async detect(text: string): Promise<string> {
		// Send request to Yandex Translate API
		const result = await fetch("https://translate.yandex.net/api/v1.5/tr.json/detect?key=trnsl.1.1.20190512T095229Z.d8c8b8a7c7f0a8a3.c7a8f3e7a9b9f9c7f9e8c0d7c0c5d6b7c6b8c8", {
			method: "POST",
			body: JSON.stringify({
				text: [text]
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data.lang;
	}

	async translate(text: string, from: string, to: string): Promise<string> {
		// Send request to Yandex Translate API
		const result = await fetch("https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20190512T095229Z.d8c8b8a7c7f0a8a3.c7a8f3e7a9b9f9c7f9e8c0d7c0c5d6b7c6b8c8", {
			method: "POST",
			body: JSON.stringify({
				text: [text],
				lang: `${from}-${to}`
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data.text[0];
	}
}
