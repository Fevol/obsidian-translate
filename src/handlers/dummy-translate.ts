import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import type {Writable} from "svelte/store";
import {writable} from "svelte/store";

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
		let output: ValidationResult;
		try {
			output = await this.service_validate();
			if (output.valid)
				this.failure_count = 0;
			return output;
		} catch (e) {
			return {valid: false, message: `Validation failed:\n${e.message}`};
		}
	}

	async service_validate(): Promise<ValidationResult> {
		// Will always be valid
		return {valid: false, message: 'This should not ever be called'};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];
		if (!text.trim())
			return [{message: "No text was provided"}];

		let output: Array<DetectionResult>;
		try {
			output = await this.service_detect(text);
			if (output.length === 1 && !output[0].message && !output[0].language)
				output = [{message: "Language detection failed:\n(Could not detect language)"}];

			this.success();
		} catch (e) {
			output = [{message: `Language detection failed:\n(${e.message})`}];
			this.failed();
		}

		return output;
	}

	async service_detect(text: string): Promise<Array<DetectionResult>> {
		// Perfect detection
		return null;
	}


	async translate(text: string, from: string, to: string): Promise<TranslationResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};
		if (!text.trim())
			return {message: "No text was provided"};
		if (!to)
			return {message: "No target language was provided"};
		if (from === to)
			return {translation: text};

		let output: TranslationResult;
		try {
			output = await this.service_translate(text, from, to);
			this.success();
		} catch (e) {
			output = {message: `Translation failed:\n(${e.message})`};
			this.failed();
		}

		return output;
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		// Perfect translation
		return {translation: text, detected_language: null};
	}


	async languages(): Promise<LanguagesFetchResult> {
		if (!this.valid)
			return {message: "Translation service is not validated"};

		let output: LanguagesFetchResult;
		try {
			output = await this.service_languages();
			this.success();
		} catch (e) {
			output = {message: `Languages fetching failed:\n(${e.message})`};
			this.failed();
		}

		return output;
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		// All languages
		return {message: 'This should not ever be called'};
	}

	has_autodetect_capability(): boolean {
		return false;
	}
}
