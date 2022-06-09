// Import plugin settings

import {DummyTranslate} from "./dummy-translate";
import type {KeyedObject} from "../types";

export class GoogleTranslate extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate(): Promise<boolean> {
		const result = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?`, {
			method: 'GET',
			body: JSON.stringify({
				key: this.api_key,
				target: 'en',
				model: 'nmt',
			}),
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		return result.ok;
	}

	async detect(text: string): Promise<string> {
		const result = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?`, {
			method: 'POST',
			body: JSON.stringify({
				key: this.api_key,
				q: text,
			}),
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const data = await result.json();
		// Data = {"detections":[[{"language":"en", "confidence":1}], ...], ...}
		return data.data.detections[0][0].language;
	}

	async translate(text: string, from: string, to: string): Promise<KeyedObject> {
		const result = await fetch(`https://translation.googleapis.com/language/translate/v2?`, {
			method: 'POST',
			body: JSON.stringify({
				key: this.api_key,
				q: text,
				source: from === 'auto' ? undefined : from,
				target: to,
				format: 'text',
				model: 'nmt',
			}),
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const data = await result.json();
		// Data = [{"text":"Hello", "detected_source_language":"en", "model":"nmt"}, ...]
		return {translation: data.data.translations[0].translatedText, detected_language: data.data.translations[0].detectedSourceLanguage};
	}

	async get_languages(): Promise<string[]> {
		const result = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?`, {
			method: 'GET',
			body: JSON.stringify({
				key: this.api_key,
				target: 'en',
				model: 'nmt',
			}),
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const data = await result.json();
		// Data = [{"language":"en", "name":"English"}, ...]
		return data.data.languages.map((l: { language: any; name: any; }) => l.language);
	}

}
