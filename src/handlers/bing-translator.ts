import {DummyTranslate} from "./dummy-translate";

export class BingTranslator extends DummyTranslate {
	api_key: string;

	constructor(api_key: string) {
		super();
		this.api_key = api_key;
	}

	async validate() {
		// FIXME: Multiple authentication types are allowed
		const result = await fetch("https://api.cognitive.microsoft.com/issuetoken", {
			method: "POST",
			body: JSON.stringify({
				request_type: "issueToken",
				subscription_key: this.api_key
			}),
			headers: {
				"Content-Type": "application/json"
			}
		});
		return result.ok;
	}
}
