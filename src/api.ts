import type TranslatorPlugin from "./main";
import {get} from "svelte/store";
import {all_languages, available_languages, settings} from "./stores";

import type {DetectionResult, LanguagesFetchResult, ServiceOptions, TranslationResult} from "./handlers/types";

interface APIOptions extends ServiceOptions {
    /**
     * If target language is unspecified, forces it to be set to Obsidian's display language
     */
    force_display?: boolean;
}

export class TranslateAPI {
    constructor(public plugin: TranslatorPlugin) {

    }

    /**
     * Get the plugin settings
     */
    get settings() {
        return get(settings);
    }

    /**
     * Get the list of languages that can be translated to and from for the currently set translation service
     * (spellchecker/manual filters applied)
     * @returns List of languages
     * @example
     * const languages = this.app.available_languages;
     * languages = ["en", "fr", "de"];
     * // EXAMPLE: Create a dropdown/selection for each of these languages
     */
    get available_languages() {
        return get(available_languages);
    }

    /**
     * Get whether the translation service is available
     */
    get canTranslate() {
        return this.plugin.translator && this.plugin.translator.valid;
    }

    /**
     * Get whether the language detector service is available
     */
    get canDetectLanguage() {
        return this.plugin.detector && this.plugin.detector.valid;
    }

    /**
     * Get the object that translates ISO639 language codes to their names in the user's preferred language
     */
    get getLanguageNames() {
        return get(all_languages);
    }

    /**
     * Translate the given text from a source language to a target language
     *
     * @param text - Text to translate
     * @param from - Source language, may be null if language is to be detected, must exist in available_languages
     * @param to - Target language, may be null (will set to user default), must exist in available_languages
     * @param options - Additional options to pass to the service, see 'types.d.ts' for more information
     * @returns Object containing translated text, detected language, detection confidence, status code, and message
     * @example (Success)
     * const result = await this.app.translate("Hello world", "en", "fr");
     * result = {
     *   translation: "Bonjour le monde",
     *   confidence: 0.99,
     *   status_code: 200,
     * }
     * @example (Error)
     * const result = await this.app.translate("Hello world", "en", "fr");
     * result = {
     *  status_code: 400,
     *  message: "Translation service is not available"
     * }
     */
    async translate(text: string, from?: string, to?: string, options?: APIOptions): Promise<TranslationResult> {
        if (!this.plugin.translator)
            return {status_code: 400, message: "Translation service is not available"};


        if (!to) {
            const loaded_settings = get(settings);
            if (options.force_display) {
                to = this.plugin.current_language;
            } else {
                if (loaded_settings.target_language_preference === "last")
                    to = loaded_settings.last_used_target_languages[0];
                else if (loaded_settings.target_language_preference === "specific")
                    to = loaded_settings.default_target_language;
                else if (loaded_settings.target_language_preference === "display")
                    to = this.plugin.current_language;
            }
        }

        return this.plugin.translator.translate(text, from, to, options);
    }

    /**
     * Detect the language of the given text
     * @param text - Text to detect language of
     * @returns Object containing detected language, detection confidence, status code, and message
     * @example (Success)
     * const result = await this.app.detect("Hello world");
     * result = {
     *  detected_languages: [
     *    { language: "en", confidence: 0.95 },
     *    { language: "fr", confidence: 0.04 },
     *  ],
     *  status_code: 200,
     * }
     * @example (Error)
     * const result = await this.app.detect("Hello world");
     * result = {
     *  status_code: 400,
     *  message: "Detection service is not available"
     * }
     */
    async detect(text: string): Promise<DetectionResult> {
        if (!this.plugin.detector)
            return {status_code: 400, message: "Detection service is not available"}

        return this.plugin.detector.detect(text);
    }

    /**
     * Get the list of languages that can be translated to and from for the default/global translation service
     * @returns Object containing list of languages (optionally extra model data, for bergamot)
     * @example (Success)
     * const result = await this.app.languages();
     * result = {
     *  languages: ["en", "fr", "de"],
     *  status_code: 200,
     * }
     * @example (Error)
     * const result = await this.app.languages();
     * result = {
     *  status_code: 400,
     *  message: "Translation service is not available"
     * }
     */
    async languages(): Promise<LanguagesFetchResult> {
        if (!this.plugin.translator)
            return {status_code: 400, message: "Translation service is not available"};

        return this.plugin.translator.languages();
    }

    /**
     * Get the correct language name for given ISO639 language code (based on user's preferred display language)
     * @param code - ISO639 language code
     * @returns Language name or original code if not found
     */
    getLanguageName(code: string): string {
        const language_dict = get(all_languages);
        return language_dict.get(code) ?? code;
    }
}
