export class DummyTranslate {
	failure_count: number;

	constructor() {
		this.failure_count = 0;
	}

	async validate(): Promise<any[2]> {
		// Will always be valid
		return [false, 'This should not ever be called'];
	}

	async detect(text: string): Promise<string> {
		// Fuck if I know
		return null;
	}

	async translate(text: string, from: string, to: string): Promise<Object> {
		// Perfect translation
		return {translation: text};
	}

	async get_languages(): Promise<string[]> {
		// Everything and nothing
		return [];
	}
}
