// Import plugin settings

import {DummyTranslate} from "./dummy-translate";

export class GoogleTranslate extends DummyTranslate {
	constructor() {
		super();
	}

	async detect(text: string): Promise<string> {
		// Send request to Google Translate API
		const result = await fetch("https://translate.googleapis.com/translate_a/single", {
			method: "POST",
			body: JSON.stringify({
				q: text,
				client: "gtx",
				sl: "auto",
				tl: "auto"
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data[2][0][0];
	}

	async translate(text: string, from: string, to: string): Promise<string> {
		// Send request to Google Translate API
		const result = await fetch("https://translate.googleapis.com/translate_a/single", {
			method: "POST",
			body: JSON.stringify({
				q: text,
				client: "gtx",
				sl: from,
				tl: to
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data[0][0][0];
	}

	async auto_translate(text: string, to: string): Promise<Object> {
		// Send request to Google Translate API
		const result = await fetch("https://translate.googleapis.com/translate_a/single", {
			method: "POST",
			body: JSON.stringify({
				q: text,
				client: "gtx",
				sl: "auto",
				tl: to
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data;
	}
}
