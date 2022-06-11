import {DummyTranslate} from "./dummy-translate";

export class BingTranslator extends DummyTranslate {
	api_key: string;
	region: string;

	constructor(api_key: string, region: string) {
		super();
		this.api_key = api_key;
		this.region = region;
	}

	async validate(): Promise<any[2]> {
		if (!this.api_key)
			return [false, "API key was not specified"];

		// TODO: Check if there is a better way to validate the API key
		try {
			const headers: any = {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
			}
			if (this.region)
				headers["Ocp-Apim-Subscription-Region"] = this.region;

			const result = await fetch("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&"
				+ new URLSearchParams({
					from: "",
					to: "en",
					textType: "plain"
				}), {
				method: "POST",
				body: JSON.stringify([{'Text': ''}]),
				headers: headers
			});
			return [result.ok, ""];
		} catch (e) {
			return [false, e.message];
		}

	}

	async detect(text: string): Promise<string> {
		const headers: any = {
			"Content-Type": "application/json",
			"Ocp-Apim-Subscription-Key": this.api_key,
		}
		if (this.region)
			headers["Ocp-Apim-Subscription-Region"] = this.region;

		const result = await fetch("https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=text", {
			method: "POST",
			body: JSON.stringify({
				text: text
			}),
			headers: headers
		});
		const data = await result.json();
		return data.detectedLanguages[0].language;
	}

	async translate(text: string, from: string, to: string): Promise<Object> {
		const headers: any = {
			"Content-Type": "application/json",
			"Ocp-Apim-Subscription-Key": this.api_key,
		}
		if (this.region)
			headers["Ocp-Apim-Subscription-Region"] = this.region;

		const result = await fetch("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&"
			+ new URLSearchParams({
				from: from === "auto" ? "" : from,
				to: to,
				textType: "plain"
			}), {
			method: "POST",
			body: JSON.stringify([{'Text': text}]),
			headers: headers
		});
		const data = await result.json();
		if (from === "auto")
			return {translation: data[0].translations[0].text, detected_language: data[0].detectedLanguage.language};
		else
			return {translation: data[0].translations[0].text};
	}

	async get_languages(): Promise<string[]> {
		const headers: any = {
			"Content-Type": "application/json",
			"Ocp-Apim-Subscription-Key": this.api_key,
		}
		if (this.region)
			headers["Ocp-Apim-Subscription-Region"] = this.region;

		const result = await fetch("https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation", {
			method: "GET",
			headers: headers
		});
		const data = await result.json();
		return Object.keys(data.translation);
	}

}
