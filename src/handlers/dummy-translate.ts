import type {KeyedObject} from "../types";

export class DummyTranslate {
	failure_count: number;

	constructor() {
		this.failure_count = 0;
	}

	async validate() {
		// Will always be valid
		return true;
	}

	async detect(text: string): Promise<string> {
		// Fuck if I know
		return null;
	}

	async translate(text: string, from: string, to: string): Promise<KeyedObject> {
		// Perfect translation
		return {translation: text};
	}

	async get_languages(): Promise<string[]> {
		// Everything and nothing
		return [];
	}
}
