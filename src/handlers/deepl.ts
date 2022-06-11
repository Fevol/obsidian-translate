import {DummyTranslate} from "./dummy-translate";

// TODO: Select API endpoint used
// TODO: Allow for formality features to be accessed
// TODO: Allow for formatting to be preserved
// Check if split_sentences option causes problems
//   --> .join all the translations together
// Check if language code being lower/uppercase makes a difference

export class Deepl extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate(): Promise<any[2]> {
		if (!this.api_key)
			return [false, "API key was not specified"];
		try {
			const result = await fetch("https://api.deepl.com/v2/usage", {
				method: "POST",
				body: JSON.stringify({}),
				headers: {
					"Content-Type": "application/json",
					"Authorization": "DeepL-Auth-Key " + this.api_key
				}
			});
			return [result.ok, ""];
		} catch (e) {
			return [false, e.message];
		}
	}

	async detect(text: string): Promise<string> {
		const result = await fetch("https://api.deepl.com/v2/translate", {
			method: "POST",
			body: JSON.stringify({
				text: text,
				target_lang: "EN-GB",
			}),
			headers: {
				"Content-Type": "application/json",
				"Authorization": "DeepL-Auth-Key " + this.api_key
			}
		});
		const data = await result.json();
		// Data = [{"text":"Hello", "detected_source_language":"en"}, ...]
		return data.language.toLowerCase();
	}

	async translate(text: string, from: string, to: string): Promise<Object> {
		const result = await fetch("https://api.deepl.com/v2/translate", {
			method: "POST",
			body: JSON.stringify({
				text: text,
				source_lang: from,
				target_lang: to,
				split_sentences: false,
				preserve_formatting: false,
			}),
			headers: {
				"Content-Type": "application/json",
				"Authorization": "DeepL-Auth-Key " + this.api_key
			}
		});
		const data = await result.json();
		// Data = [{"text":"Hello", "detected_source_language":"en"}, ...]
		if (from === "auto")
			return {translation: data.translations[0].text, detected_language: data.translations[0].detected_source_language.toLowerCase()};
		else
			return {translation: data.translations[0].text};
	}


	async get_languages(): Promise<string[]> {
		const result = await fetch("https://api.deepl.com/v2/languages", {
			method: "POST",
			body: JSON.stringify({}),
			headers: {
				"Content-Type": "application/json",
				"Authorization": "DeepL-Auth-Key " + this.api_key
			}
		});
		const data = await result.json();
		// Data = [{"language":"EN", "name":"English", supports_formality: true}, ...]
		return data.map((o: any) => o.language.toLowerCase());
	}

}
