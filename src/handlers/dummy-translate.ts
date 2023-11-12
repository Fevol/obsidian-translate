import type {
	DetectionResult,
	GlossaryFetchResult, GlossaryUploadResult,
	LanguagesFetchResult,
	TranslationResult,
	ValidationResult,
	ServiceOptions,
	ServiceSettings,
} from "./types";
import type {ModelFileData} from "../types";

import {get, writable, type Writable} from "svelte/store";
import {DefaultDict, regexLastIndexOf} from "../util";
import {globals, glossary, settings} from "../stores";
import t from "../l10n";

export class DummyTranslate {
	/**
	 * Internal counter for the number of times the service has failed
	 */
	failure_count: number;

	/**
	 * Writable for the number of times the service has failed
	 * @remark This is a writable store, so that a listener can set the service as invalidated if it fails too many times, and update other components
	 */
	failure_count_watcher: Writable<number>;

	/**
	 * Identifier for the service, used to get display name, icon, etc.
	 * @virtual
	 */
	id = "dummy";

	/**
	 * Lists all languages supported by the service
	 */
	available_languages: string[] = [];

	/**
	 * Default options/actions for the service
	 */
	options: ServiceOptions = {};

	/**
	 * Internal validity status of the service, service functionality cannot be used if this is false
	 * @remark Service becomes invalid when it fails too many times, or when the user changes the settings
	 */
	valid: boolean;

	/**
	 * Determines whether the service is the default/global service for the plugin (i.e. the one used for translating files)
	 */
	default: boolean = false;

	/**
	 * The maximum number of bytes that can be sent in a single translation request
	 */
	character_limit: number = Infinity;

	/**
	 * Amount of time service should wait between sending requests
	 */
	wait_time: number = 0;

	base_status_code_lookup: {[key: number]: string | undefined} = {
		200: undefined,
		400: "Bad request, query parameters missing [OPEN ISSUE ON GITHUB]",
		401: "Unauthenticated request, check credentials",
		402: "Insufficient funds, check API key status",
		403: "Unauthorized request, check credentials/free quota exceeded",
		404: "Not found [OPEN ISSUE ON GITHUB]",
		405: "Method not allowed",
		408: "Request timed out, try again later",
		413: "Request too large, reduce text size [OPEN ISSUE ON GITHUB]",
		422: "Text can not be translated",
		429: "Exceeded rate limit, try again later",
		456: "Character quota exceeded",
		500: "Internal server error, try again later",
		503: "Service unavailable, try again later",
	};

	constructor() {
		this.failure_count = 0;
		this.failure_count_watcher = writable<number>(0);
		this.valid = true;
	}

	/**
	 * Internal function to handle errors, keep track of failure count
	 * @internal
	 */
	failed(): void {
		this.failure_count++;
		this.failure_count_watcher.set(this.failure_count);
	}

	/**
	 * Internal function to handle succesful requests, reset failure count
	 * @internal
	 */
	success(): void {
		this.failure_count = 0;
		this.failure_count_watcher.set(0);
	}

	/**
	 * Helper function to update private translator variables
	 * @param settings - Settings to update
	 */
	update_settings(settings: ServiceSettings): void {}

	/**
	 * Validate the service based upon its current settings
	 * @returns Object containing validation output, status code, and message
	 */
	async validate(): Promise<ValidationResult> {
		let output: ValidationResult;
		try {
			output = await this.service_validate();
			if (output.valid)
				this.failure_count = 0;
			else
				output.message = `Validation failed:\n\t${output.message || output.status_code}`;

			return output;
		} catch (e: any) {
			output = {status_code: 400, valid: false, message: `Validation failed:\n\t${e.message}`};
			return output;
		} finally {
			this.valid = output!.valid;
		}
	}

	/**
	 * Internal function to run the service-specific validation logic
	 * @virtual
	 */
	async service_validate(): Promise<ValidationResult> {
		// Will always be valid
		return {status_code: 400, valid: false, message: 'This should not ever be called'};
	}

	/**
	 * Detect the language of the given input text
	 * @param text - Text to detect language of
	 * @returns Object containing detected languages and calculated confidences, status code, and message
	 */
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

			if (output.status_code! > 200)
				return this.detected_error("Language detection failed", output);

			if (!output.detected_languages)
				output = {message: "Language detection failed:\n\t(Could not detect language)", status_code: 400};


			this.success();
			return output;
		} catch (e: any) {
			return this.detected_error("Language detection failed", {message: e.message});
		}
	}

	/**
	 * Internal function to run the service-specific language detection logic
	 * @param text - Text to detect language of
	 * @virtual
	 */
	async service_detect(text: string): Promise<DetectionResult> {
		return {status_code: 400, detected_languages: [], message: 'This should not ever be called'};
	}

	/**
	 * Translate the given text from a source language to a target language
	 *
	 * @param text - Text to translate
	 * @param from - Source language, may be null if language is to be detected, must exist in available_languages
	 * @param to - Target language, must exist in available_languages
	 * @param options - Additional options to pass to the service, see 'types.d.ts' for more information
	 * @returns Object containing translated text, detected language, detection confidence, status code, and message
	 */
	async translate(text: string, from: string, to: string, options: ServiceOptions = {}): Promise<TranslationResult> {
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
		if (from && from !== 'auto' && !this.available_languages.includes(from))
			return {status_code: 400, message: `Source language "${t(from)}" is not supported`};
		if (!this.available_languages.includes(to))
			return {status_code: 400, message: `Target language "${t(to)}" is not supported`};
		if (!from)
			from = "auto";

		let output: TranslationResult;
		try {
			let temp_detected_language: string | null = from;
			let detecting_language = false;
			if (options.apply_glossary && !options.glossary) {
				detecting_language = from === 'auto' && !(globals.plugin!.detector == null ) && globals.plugin!.detector.valid;
				// TODO: Give warning if globals.plugin.detector is null
				if (detecting_language || from !== 'auto') {
					if (detecting_language) {
						const detection_results = await globals.plugin!.detector.detect(text);
						if (detection_results.detected_languages)
							temp_detected_language = detection_results.detected_languages[0].language!;
						else
							temp_detected_language = null;
					}

					if (temp_detected_language) {
						from = temp_detected_language;
						const language_pair = from + '_' + to;
						const loaded_settings = get(settings);

						// First, check if online glossary is available, always prefer this
						if (loaded_settings.glossary_preference !== 'local') {
							// @ts-ignore (service is always in service_settings)
							options.glossary_id = loaded_settings.service_settings[this.id].uploaded_glossaries?.[language_pair];
						}

						if (loaded_settings.glossary_preference === 'local' || (loaded_settings.glossary_preference === 'online' && !options.glossary)) {
							const glossary_pair: string[][] = glossary.dicts[language_pair as keyof typeof glossary.dicts];
							if (from && glossary_pair) {
								text = text.replace(glossary.replacements[language_pair as keyof typeof glossary.replacements],
									(match) => {
										// TODO: Check if case insensitivity per word is also feasible,
										//  issue would be that the search would always have to be executed with case-insensitive matching
										//  and then case-sensitivity check should happen here (by removing toLowerCase())
										//  either way: heavy performance impact
										// @ts-ignore
										return glossary_pair.find(x => x[0].toLowerCase() === match.toLowerCase())[1] || match;
									});
							}
						}
					}
				}
			}

			// Merges provided options with default service options, provided options take precedence
			options = {...options, ...this.options};

			if (text.length < this.character_limit) {
				output = await this.service_translate(text, from, to, options);
				if (output.status_code !== 200)
					return this.detected_error("Translation failed", output);
				if (detecting_language && temp_detected_language)
					output.detected_language = temp_detected_language;
			} else {
				let idx = 0;
				let translation = '';
				const languages_occurrences = new DefaultDict({}, 0);


				/** This does *not* preserve sentence meaning when translating, as it splits sentences at spaces.
				 *  However, this is the best (most efficient in both space and time) approach, without having to
				 *	perform sentence tokenization (aka: dreadful NLP processing).
				 */
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
					const result = await this.service_translate(chunk, from, to, options);
					if (result.status_code !== 200) {
						return this.detected_error("Translation failed", result);
					} else {
						translation += (idx ? text.at(idx - 1)! : '') + result.translation;
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
		} catch (e: any) {
			return this.detected_error("Translation failed", {message: e.message});
		}
	}

	/**
	 * Internal function to run the service-specific translation logic
	 * @param text - The text to translate
	 * @param from - The language to translate from
	 * @param to - The language to translate to
	 * @param [glossary_id=undefined] - The glossary ID of the online service to use (leave undefined if not applicable)
	 * @returns Object containing the translation and the detected language & confidence (if applicable), as well as the status code and message
	 * @virtual
	 */
	async service_translate(text: string, from: string, to: string, options: ServiceOptions = {} = {}): Promise<TranslationResult> {
		// Perfect translation
		return {status_code: 400, translation: text, detected_language: undefined};
	}

	/**
	 * Get most up-to-date list of supported languages for this service
	 * @returns Object containing the list of supported languages, the status code and message
	 */
	async languages(): Promise<LanguagesFetchResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};

		let output: LanguagesFetchResult;
		try {
			output = await this.service_languages();
			if (output.status_code !== 200)
				return this.detected_error("Languages fetching failed", output);
			this.success();
			if (this.id !== 'bergamot')
				this.available_languages = <string[]>output.languages;
			return output;
		} catch (e: any) {
			return this.detected_error("Languages fetching failed", {message: e.message});
		}
	}

	/**
	 * Internal function to run the service-specific languages fetching logic
	 * @returns Object containing the list of supported languages, the status code and message
	 * @virtual
	 */
	async service_languages(): Promise<LanguagesFetchResult> {
		// All languages
		return {status_code: 400, message: 'This should not ever be called'};
	}

	/**
	 * Get most up-to-date list of supported glossary language-pairs for this service
	 * @returns Object containing the list of supported glossary language-pairs, the status code and message
	 * @virtual
	 */
	async glossary_languages(): Promise<GlossaryFetchResult> {
		if (!this.valid)
			return {status_code: 400, message: "Translation service is not validated"};
		const output = await this.service_glossary_languages();
		if (output.status_code !== 200)
			return this.detected_error("Glossary languages fetching failed", output);
		this.success();
		return output;
	}

	/**
	 * Internal function to run the service-specific glossary languages fetching logic
	 * @returns Object containing the list of supported glossary language-pairs, the status code and message
	 * @virtual
	 */
	async service_glossary_languages(): Promise<GlossaryFetchResult> {
		return {status_code: 400, message: 'This should not ever be called'};
	}

	/**
	 * Upload glossaries for all supported language-pairs to this service
	 * @param glossary - The glossaries to upload
	 * @param glossary_languages - All supported glossary language-pairs
	 * @param previous_glossaries_ids - The glossary IDs of the previous glossaries, will be removed and replaced by the new glossaries
	 * @returns Object containing the list of new glossary IDs, the status code and message
	 */
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

	/**
	 * Internal function to run the service-specific glossary uploading logic
	 * @param glossary - The glossaries to upload
	 * @param glossary_languages - All supported glossary language-pairs
	 * @param previous_glossaries_ids - The glossary IDs of the previous glossaries, will be removed and replaced by the new glossaries
	 * @returns Object containing the list of new glossary IDs, the status code and message
	 * @virtual
	 */
	async service_glossary_upload(glossary: any, glossary_languages: Record<string, string[]>, previous_glossaries_ids: Record<string, string>): Promise<GlossaryUploadResult> {
		return {status_code: 400, message: 'This should not ever be called'};
	}


	/**
	 * Function to determine whether service is capable of auto-detecting the language of the text and translating from it
	 * @returns Boolean indicating whether auto-detection is supported
	 * @virtual
	 */
	has_autodetect_capability(): boolean {
		return false;
	}

	update_data(available_models: ModelFileData): void {}

	setup_service(available_models: ModelFileData): void {}


	/**
	 * Internal function to prettify error messages from the handlers and update failure count
	 * @param prefix - The prefix to add to the error message (e.g. "Translation failed")
	 * @param response - The response object from the handler
	 * @returns Object containing prettified status code and message
	 * @private
	 */
	detected_error(prefix: string, response: {status_code?: number, message?: string}): { message: string, status_code: number } {
		// Attempt to create a more descriptive error message is no message was given
		if (!response.message)
			response.message = this.base_status_code_lookup[response.status_code!] ?? `Unknown error`;
		response.message += ` (${response.status_code})`;

		this.failed();
		return {
			message: `${prefix}:\n\t${response.message}`,
			status_code: response.status_code || 400,
		};
	}
}
