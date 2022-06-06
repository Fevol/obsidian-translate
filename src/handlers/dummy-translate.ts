export class DummyTranslate {
	constructor() {
	}

	async detect(text: string): Promise<string> {
		// Fuck if I know
		return null;
	}

	async translate(text: string, from: string, to: string): Promise<string> {
		// Perfect translation
		return text;
	}
	
	async auto_translate(text: string, to: string): Promise<Object> {
		// Still have no clue what I'm supposed to do with this
		return {text: text, predict: null};
	}
}
