// Import plugin settings

import {DummyTranslate} from "./dummy-translate";

export class GoogleTranslate extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate(): Promise<Object> {
		if (!this.api_key)
			return [false, "API key was not specified"];

		try {
			const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?`, {
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
			return [response.ok, ""];
		} catch (e) {
			return [false, e.message];
		}
	}


	async detect(text: string): Promise<string> {
		const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?`, {
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
		const data = await response.json();
		// Data = {"detections":[[{"language":"en", "confidence":1}], ...], ...}
		return data.data.detections[0][0].language;
	}

	async translate(text: string, from: string, to: string): Promise<Object> {
		const response = await fetch(`https://translation.googleapis.com/language/translate/v2?`, {
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
		const data = await response.json();
		// Data = [{"text":"Hello", "detected_source_language":"en", "model":"nmt"}, ...]
		return {translation: data.data.translations[0].translatedText, detected_language: data.data.translations[0].detectedSourceLanguage};
	}

	async get_languages(): Promise<string[]> {
		const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?`, {
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
		const data = await response.json();
		// Data = [{"language":"en", "name":"English"}, ...]
		return data.data.languages.map((l: { language: any; name: any; }) => l.language);
	}

}
