import {Obj} from "tern";
import {KeyedObject} from "../types";

export class DummyTranslate {
	constructor() {
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

	async auto_translate(text: string, to: string): Promise<Object> {
		// Still have no clue what I'm supposed to do with this
		return {text: text, predict: null};
	}

	async get_languages(): Promise<string[]> {
		// Everything and nothing
		return [];
	}
}
