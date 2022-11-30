import type {
	DetectionResult,
	GlossaryFetchResult, GlossaryUploadResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult
} from "../types";
import {get, writable, type Writable} from "svelte/store";
import {DefaultDict, regexLastIndexOf} from "../util";
import {globals, glossary, settings} from "../stores";

export class DummyTranslate {
	// Due to the fact that failure_count will be accessed many times, it's best if we don't have to call get from
	//	svelte/store each time, as that will require a subscribe and an unsubscribe every time we execute translator logic
	failure_count: number;
	failure_count_watcher: Writable<number>;
	id = "dummy";

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
		if (!this.valid) {
			if (this.id === "fasttext")
				return {status_code: 400, message: "FastText is not installed"};
			return {status_code: 400, message: "Translation service is not validated"};
		}
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


	async translate(text: string, from: string, to: string, apply_glossary: boolean = false): Promise<TranslationResult> {
		if (!this.valid) {
			if (this.id === "bergamot")
				return {status_code: 400, message: "Bergamot is not installed"};
			return {status_code: 400, message: "Translation service is not validated"};
		}
		if (!text.trim())
			return {status_code: 400, message: "No text was provided"};
		if (!to)
			return {status_code: 400, message: "No target language was provided"};
		if (from === to)
			return {status_code: 200, translation: text};
		if (!from)
			from = "auto";

		let output: TranslationResult;
		try {
			let temp_detected_language = from;
			let glossary_id: string = undefined;
			let detecting_language = false;
			if (apply_glossary) {
				detecting_language = from === 'auto' && !(globals.plugin.detector == null);
				// TODO: Give warning if globals.plugin.detector is null
				if (detecting_language || from !== 'auto') {
					if (detecting_language) {
						const detection_results = await globals.plugin.detector.detect(text);
						if (detection_results.detected_languages)
							temp_detected_language = detection_results.detected_languages[0].language;
						else
							temp_detected_language = null;
					}

					if (temp_detected_language) {
						from = temp_detected_language;
						const language_pair = from + '_' + to;
						const loaded_settings = get(settings);

						// @ts-ignore (service is always in service_settings)
						glossary_id = loaded_settings.service_settings[this.id].uploaded_glossaries?.[language_pair];

						if (!glossary_id && loaded_settings.local_glossary) {
							const glossary_pair: string[][] = glossary.dicts[language_pair as keyof typeof glossary.dicts];
							if (from && glossary_pair) {
								text = text.replace(glossary.replacements[language_pair as keyof typeof glossary.replacements],
									(match) => {
										// TODO: Check if case insensitivity per word is also feasible,
										//  issue would be that the search would always have to be executed with case-insensitive matching
										//  and then case-sensitivity check should happen here (by removing toLowerCase())
										//  either way: heavy performance impact
										return glossary_pair.find(x => x[0].toLowerCase() === match.toLowerCase())[1] || match;
									});
							}
						}
					}
				}
			}

			if (text.length < this.character_limit) {
				output = await this.service_translate(text, from, to, glossary_id);
				if (output.status_code !== 200)
					return this.detected_error("Translation failed", output);
				if (detecting_language && temp_detected_language)
					output.detected_language = temp_detected_language;
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
					const result = await this.service_translate(chunk, from, to, glossary_id);
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

	async service_translate(text: string, from: string, to: string, glossary_id: string = undefined): Promise<TranslationResult> {
		// Perfect translation
		return {status_code: 400, translation: text, detected_language: null};
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
		return {status_code: 400, message: 'This should not ever be called'};
	}

	async glossary_languages(): Promise<GlossaryFetchResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};
		const output = await this.service_glossary_languages();
		if (output.status_code !== 200)
			return this.detected_error("Glossary languages fetching failed", output);
		this.success();
		return output;
	}


	async service_glossary_languages(): Promise<GlossaryFetchResult> {
		return {status_code: 400, message: 'This should not ever be called'};
	}

	async glossary_upload(glossary: any, glossary_languages: Record<string, string[]>, previous_glossaries_ids: Record<string, string>): Promise<GlossaryUploadResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};
		const output = await this.service_glossary_upload(glossary, glossary_languages, previous_glossaries_ids);
		if (!output.message) {
			if (output.status_code === 200) {
				output.message = 'Glossary uploaded successfully';
				this.success();
			}
		} else {
			return this.detected_error("Glossary uploading failed", output);
		}
		return output;
	}

	async service_glossary_upload(glossary: any, glossary_languages: Record<string, string[]>, previous_glossaries_ids: Record<string, string>): Promise<GlossaryUploadResult> {
		return {status_code: 400, message: 'This should not ever be called'};
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
