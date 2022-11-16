import type {DetectionResult, LanguagesFetchResult, TranslationResult, ValidationResult} from "../types";
import {writable, type Writable} from "svelte/store";
import {DefaultDict, regexLastIndexOf} from "../util";

export class DummyTranslate {
	// Due to the fact that failure_count will be accessed many times, it's best if we don't have to call get from
	//	svelte/store each time, as that will require a subscribe and an unsubscribe every time we execute translator logic
	failure_count: number;
	failure_count_watcher: Writable<number>;

	valid: boolean;

	// Character limit of translation request in bytes
	character_limit: number = Infinity;

	// Waiting time in milliseconds between requests
	wait_time: number = 0;

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
			else
				output.message = `Validation failed:\n\t${output.message}`;

			return output;
		} catch (e) {
			output = {status_code: 400, valid: false, message: `Validation failed:\n\t${e.message}`};
			return output;
		} finally {
			this.valid = output.valid;
		}
	}

	async service_validate(): Promise<ValidationResult> {
		// Will always be valid
		return {status_code: 400, valid: false, message: 'This should not ever be called'};
	}

	async detect(text: string): Promise<DetectionResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};
		if (!text.trim())
			return {status_code: 400, message: "No text was provided"};

		let output: DetectionResult;
		try {
			// Only the first dozen words are required to detect the language of a piece of text
			// Get first 20 words of text, not all words need to be included to get proper detection
			output = await this.service_detect(text.split(/\s+/).slice(0, 20).join(" "));

			if (output.status_code > 200)
				return this.detected_error("Language detection failed", output);

			if (!output.detected_languages)
				output = {message: "Language detection failed:\n\t(Could not detect language)", status_code: 400};


			this.success();
			return output;
		} catch (e) {
			return this.detected_error("Language detection failed", {message: e.message});
		}
	}

	async service_detect(text: string): Promise<DetectionResult> {
		// Perfect detection
		return null;
	}


	async translate(text: string, from: string, to: string): Promise<TranslationResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};
		if (!text.trim())
			return {status_code: 400, message: "No text was provided"};
		if (!to)
			return {status_code: 400, message: "No target language was provided"};
		if (from === to)
			return {status_code: 200, translation: text};


		let output: TranslationResult;
		try {
			if (text.length < this.character_limit) {
				output = await this.service_translate(text, from, to);
				if (output.status_code !== 200) {
					return this.detected_error("Translation failed", output);
				}
			} else {
				let idx = 0;
				let translation = '';
				const languages_occurrences = new DefaultDict({}, 0);


				// This does *not* preserve sentence meaning when translating, as it splits sentences at spaces.
				// However, this is the best (most efficient in both space and time) approach, without having to
				//	perform sentence tokenization.
				while (idx < text.length) {
					let r_idx: number;
					if (idx + this.character_limit >= text.length)
						r_idx = Infinity;
					else {
						r_idx = regexLastIndexOf(text, /\p{Zs}/gu, idx + this.character_limit);
						if (r_idx === -1 || r_idx < idx)
							r_idx = idx + this.character_limit;
					}


					const chunk = text.slice(idx, r_idx).trim();
					const result = await this.service_translate(chunk, from, to);
					if (result.status_code !== 200) {
						return this.detected_error("Translation failed", result);
					} else {
						translation += (idx ? text.at(idx - 1) : '') + result.translation;
						if (result.detected_language)
							languages_occurrences[result.detected_language as keyof typeof languages_occurrences]++;
						idx = r_idx + 1;
					}
				}

				output = {
					translation: translation,
					detected_language: Object.entries(languages_occurrences).reduce((a, b) => a[1] > b[1] ? a : b)[0],
					status_code: 200
				};
			}
			this.success();
			return output;
		} catch (e) {
			return this.detected_error("Translation failed", {message: e.message});
		}
	}

	async service_translate(text: string, from: string, to: string): Promise<TranslationResult> {
		// Perfect translation
		return {translation: text, detected_language: null};
	}


	async languages(): Promise<LanguagesFetchResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};

		let output: LanguagesFetchResult;
		try {
			output = await this.service_languages();
			if (output.status_code !== 200)
				return this.detected_error("Languages fetching failed", output);
			this.success();
			return output;
		} catch (e) {
			return this.detected_error("Languages fetching failed", {message: e.message});
		}
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		// All languages
		return {message: 'This should not ever be called'};
	}

	has_autodetect_capability(): boolean {
		return false;
	}

	detected_error(prefix: string, response: {status_code?: number, message?: string}): { message: string, status_code: number } {
		// Attempt to create a more descriptive error message is no message was given
		if (!response.message) {
			switch (response.status_code) {
				case 400:
					response.message = 'Bad request';
					break;
				default:
					response.message = `Unknown error (${response.status_code})`;
			}
		}

		this.failed();
		return {
			message: `${prefix}:\n\t${response.message}`,
			status_code: response.status_code || 400,
		};
	}


}
