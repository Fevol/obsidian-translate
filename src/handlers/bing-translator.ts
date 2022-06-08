import {DummyTranslate} from "./dummy-translate";
import {KeyedObject} from "../types";

export class BingTranslator extends DummyTranslate {
	api_key: string;
	region: string;

	constructor(api_key: string, region: string) {
		super();
		this.api_key = api_key;
		this.region = region;
	}

	async validate() {
		// TODO: Check if there is a better way to validate the API key
		const result = await fetch("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&"
			+ new URLSearchParams({
				from: "",
				to: "en",
				textType: "plain"
			}), {
			method: "POST",
			body: JSON.stringify([{'Text': ''}]),
			headers: {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
				//TODO: Add region as setting
				"Ocp-Apim-Subscription-Region": this.region
			}
		});
		return result.ok;
	}

	async detect(text: string): Promise<string> {
		const result = await fetch("https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=text", {
			method: "POST",
			body: JSON.stringify({
				text: text
			}),
			headers: {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
				"Ocp-Apim-Subscription-Region": "westeurope"
			}
		});
		const data = await result.json();
		return data.detectedLanguages[0].language;
	}

	async translate(text: string, from: string, to: string): Promise<KeyedObject> {
		const result = await fetch("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&"
			+ new URLSearchParams({
				from: from === "auto" ? "" : from,
				to: to,
				textType: "plain"
			}), {
			method: "POST",
			body: JSON.stringify([{'Text': text}]),
			headers: {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
				"Ocp-Apim-Subscription-Region": "WestEurope"
			}
		});
		const data = await result.json();
		if (from === "auto")
			return {translation: data[0].translations[0].text, detected_language: data[0].detectedLanguage.language};
		else
			return {translation: data[0].translations[0].text};
	}

	async get_languages(): Promise<string[]> {
		const result = await fetch("https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": this.api_key,
				"Ocp-Apim-Subscription-Region": "WestEurope"
			}
		});
		const data = await result.json();
		return Object.keys(data.translation);
	}

}
