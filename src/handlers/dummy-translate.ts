import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import type {Writable} from "svelte/store";
import {writable} from "svelte/store";
import {DefaultDict, regexLastIndexOf} from "../util";

export class DummyTranslate {
	// Due to the fact that failure_count will be accessed many times, it's best if we don't have to call get from
	//	svelte/store each time, as that will require a subscribe and an unsubscribe every time we execute translator logic
	failure_count: number;
	failure_count_watcher: Writable<number>;

	valid: boolean;

	// Character limit of translation request in bytes
	character_limit: number = Infinity;

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
			output = {valid: false, message: `Validation failed:\n${e.message}`};
			return output;
		} finally {
			this.valid = output.valid;
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
			// Only the first dozen words are required to detect the language of a piece of text
			// Get first 20 words of text, not all words need to be included to get proper detection
			const words = text.split(/\s+/).slice(0, 20).join(" ");
			output = await this.service_detect(words);
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
			if (text.length < this.character_limit) {
				output = await this.service_translate(text, from, to);
				this.success();
			} else {
				let idx = 0;
				let translation = '';
				const languages_occurrences = new DefaultDict(0);

				// This does *not* preserve sentence meaning when translating, as it splits sentences at spaces.
				// However, this is the best (most efficient in both space and time) approach, without having to
				//	perform sentence tokenization.
				while (idx < text.length) {
					let r_idx: number;
					if (idx + this.character_limit >= text.length)
						r_idx = Infinity;
					else {
						r_idx = regexLastIndexOf(text, idx + this.character_limit, /\p{Zs}/gu);
						if (r_idx === -1 || r_idx < idx)
							r_idx = idx + this.character_limit;
					}

					const chunk = text.slice(idx, r_idx).trim();
					const result = await this.service_translate(chunk, from, to);
					if (result.message) {
						throw new Error(result.message);
					} else {
						translation += (idx ? text.at(idx - 1) : '') + result.translation;
						if (result.detected_language)
							languages_occurrences[result.detected_language as keyof typeof languages_occurrences]++;
						idx = r_idx + 1;
					}
				}
				output = {
					translation: translation,
					detected_language: Object.entries(languages_occurrences).reduce((a, b) => a[1] > b[1] ? a : b)[0]
				};
			}
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
