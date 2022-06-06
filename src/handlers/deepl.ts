import {DummyTranslate} from "./dummy-translate";

export class Deepl extends DummyTranslate {
	constructor() {
		super();
	}

	async detect(text: string): Promise<string> {
		// Send request to Deepl Translate API
		const result = await fetch("https://api.deepl.com/v2/detect", {
			method: "POST",
			body: JSON.stringify({
				text: [text]
			}),
			headers: {"Content-Type": "application/json", "Ocp-Apim-Subscription-Key": "b9f1c0c1b6c64b8d8f2c2d9e9b2c2f9"}
		});
		const data = await result.json();
		return data[0].language;
	}

	async translate(text: string, from: string, to: string): Promise<string> {
		// Send request to Deepl Translate API
		const result = await fetch("https://api.deepl.com/v2/translate", {
			method: "POST",
			body: JSON.stringify({
				text: [text],
				source_lang: from,
				target_lang: to
			}),
			headers: {"Content-Type": "application/json", "Ocp-Apim-Subscription-Key": "b9f1c0c1b6c64b8d8f2c2d9e9b2c2f9"}
		});
		const data = await result.json();
		return data[0].translations[0].text;
	}
}
