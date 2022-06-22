import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import type {Writable} from "svelte/store";
import {writable} from "svelte/store";

export class DummyTranslate {
	failure_count: number;
	valid: Writable<boolean> = writable(true);

	constructor() {
		this.failure_count = 0;
	}

	failed(): void {
		this.failure_count++;
		if (this.failure_count >= 10)
			this.valid.set(false);
	}

	success(): void {
		this.failure_count = 0;
	}

	async validate(): Promise<ValidationResult> {
		// Will always be valid
		return {valid: false, message: 'This should not ever be called'};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		// Fuck if I know
		return null;
	}

	async translate(text: string, from: string, to: string): Promise<TranslationResult> {
		// Perfect translation
		return {translation: text, detected_language: null};
	}

	async get_languages(): Promise<LanguagesFetchResult> {
		// Everything and nothing
		return {message: 'This should not ever be called'};
	}
}
