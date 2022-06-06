import {DummyTranslate} from "./dummy-translate";

export class LibreTranslate extends DummyTranslate {
	host: string;

	constructor(host: string) {
		super();
		this.host = host;
	}

	async detect(text: string): Promise<string> {
		const result = await fetch(`{this.host}/detect`, {
			method: "POST",
			body: JSON.stringify({
				q: text
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return data;
	}

	async translate(text: string, from: string, to: string): Promise<string> {
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
		return data.translatedText;
	}

	async auto_translate(text: string, to: string): Promise<Object> {
		const result = await fetch(`{this.host}/translate`, {
			method: "POST",
			body: JSON.stringify({
				q: text,
				source: "auto",
				target: to
			}),
			headers: {"Content-Type": "application/json"}
		});
		const data = await result.json();
		return {text: data.translatedText, predict: null};
	}

	async get_languages(): Promise<string[]> {
		const result = await fetch(`{this.host}/languages`);
		const data = await result.json();
		return data;
	}
}
