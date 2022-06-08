import {DummyTranslate} from "./dummy-translate";
import {KeyedObject} from "../types";

export class LibreTranslate extends DummyTranslate {
	host: string;

	constructor(host: string) {
		super();
		this.host = host;
	}

	async detect(text: string): Promise<string> {
		const result = await fetch(`${this.host}/detect`, {
			method: "POST",
			body: JSON.stringify({
				q: text
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data;
	}

	async translate(text: string, from: string, to: string): Promise<KeyedObject> {
		const result = await fetch(`${this.host}/translate`, {
			method: "POST",
			body: JSON.stringify({
				q: text,
				source: from,
				target: to
			}),
			headers: {"Content-Type": "application/json"}
		});

		const data = await result.json();
		if (from === "auto")
			return {translation: data.translatedText, detected_language: data.detectedLanguage.language};
		else
			return {translation: data.translatedText};
	}

	async get_languages(): Promise<string[]> {
		const result = await fetch(`${this.host}/languages`);
		const data = await result.json();
		return Array.from(data).map((x: any) => {return x.code});
	}
}
