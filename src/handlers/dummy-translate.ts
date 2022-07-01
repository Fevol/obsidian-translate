import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import type {Writable} from "svelte/store";
import {writable} from "svelte/store";
import {Notice} from "obsidian";

export class DummyTranslate {
	// Due to the fact that failure_count will be accessed many times, it's best if we don't have to call get from
	//	svelte/store each time, as that will require a subscribe and an unsubscribe every time we execute translator logic
	failure_count: number;
	failure_count_watcher: Writable<number>;

	valid: boolean;

	constructor() {
		this.failure_count = 0;
		this.failure_count_watcher = writable<number>(0);
		this.valid = true;
	}

	failed(): void {
		this.failure_count++;
		this.failure_count_watcher.set(this.failure_count);
	}

	success(): void {
		this.failure_count = 0;
		this.failure_count_watcher.set(0);
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
