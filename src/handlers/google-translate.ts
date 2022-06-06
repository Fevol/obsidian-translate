// Import plugin settings

import {DummyTranslate} from "./dummy-translate";
import {KeyedObject} from "../types";

export class GoogleTranslate extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate() {
		const result = await fetch("https://translation.googleapis.com/language/translate/v2/languages", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				q: "en"
			}),
			headers: {
				"Content-Type": "application/json"
			}
		});
		return result.ok;
	}

	async detect(text: string): Promise<string> {
		const result = await fetch("https://translation.googleapis.com/language/translate/v2/detect", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
			}),
			headers: {
				"Content-Type": "application/json",
			}
		});
		const data = await result.json();
		return data.data.detections[0].language;
	}

	async translate(text: string, from: string, to: string): Promise<KeyedObject> {
		const result = await fetch("https://translation.googleapis.com/language/translate/v2", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				source: from,
				target: to,
				q: [text]
			}),
			headers: {
				"Content-Type": "application/json",
			}
		});
		const data = await result.json();
		return data.data.translations[0].translatedText;
	}

	async auto_translate(text: string, to: string): Promise<Object> {
		const result = await fetch("https://translation.googleapis.com/language/translate/v2", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				source: "auto",
				target: to,
				q: [text]
			}),
			headers: {
				"Content-Type": "application/json",
			}
		});
		const data = await result.json();
		return {text: data.data.translations[0].translatedText, predict: null};
	}

	async get_languages(): Promise<string[]> {
		const result = await fetch("https://translation.googleapis.com/language/translate/v2/languages", {
			method: "POST",
			body: JSON.stringify({
				key: this.api_key,
				target: "en"
			}),
			headers: {
				"Content-Type": "application/json",
			}
		});
		const data = await result.json();
		return data.data.languages.map((language: { language: any; }) => language.language);
	}
}
