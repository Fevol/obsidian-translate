import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import type {Writable} from "svelte/store";
import {writable} from "svelte/store";

export class DummyTranslate {
	constructed: boolean = false;
	failure_count: number;

	// Due to the fact that valid will be accessed many times, it's best if we don't have to call get from svelte/store
	//  each time, as that will require a subscribe and an unsubscribe every time we execute translator logic
	valid: boolean;
	valid_watcher: Writable<boolean>;


	constructor(valid: boolean) {
		this.failure_count = 0;
		this.valid_watcher = writable<boolean>(valid);
		this.valid = valid;
	}

	failed(): void {
		this.failure_count++;
		if (this.failure_count >= 10) {
			this.valid_watcher.set(false);
			this.valid = false;
		}
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
