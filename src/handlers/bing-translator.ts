import {DummyTranslate} from "./dummy-translate";

export class BingTranslator extends DummyTranslate {
	constructor() {
		super();
	}

	async detect(text: string): Promise<string> {
		// Send request to Bing Translate API
		const result = await fetch("https://api.cognitive.microsofttranslator.com/languages?api-version=3.0", {
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
		// Send request to Bing Translate API
		const result = await fetch("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0", {
			method: "POST",
			body: JSON.stringify({
				text: [text],
				from: from,
				to: to
			}),
			headers: {"Content-Type": "application/json", "Ocp-Apim-Subscription-Key": "b9f1c0c1b6c64b8d8f2c2d9e9b2c2f9"}
		});
		const data = await result.json();
		return data[0].translations[0].text;
	}
}
