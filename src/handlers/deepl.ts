import {DummyTranslate} from "./dummy-translate";

export class Deepl extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate() {
		// FIXME: Two different API endpoints are used: free and paid.
		const result = await fetch("https://api.deepl.com/v2/languages", {
			method: "POST",
			body: JSON.stringify({
				auth_key: this.api_key,
				source_lang: "en"
			}),
			headers: {
				"Content-Type": "application/json"
			}
		});
		return result.ok;
	}

}
