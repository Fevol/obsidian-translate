import type {LanguageModelData} from "../types";


interface ServiceSettings {
	/**
	 * API key for the service (if required)
	 */
	api_key?: string;

	/**
	 * App ID for the service<br>
	 * <b>Used by:</b> Fanyi QQ, Fanyi Baidu
	 */
	app_id?: string;

	/**
	 * Region for the service<br>
	 * <b>Used by:</b> Fanyi QQ, Azure Translator, Amazon Translate
	 */
	region?: string;

	/**
	 * Hostname for the service (if required)<br>
	 * <b>Used by:</b> Lingva Translate, Libre Translate, DeepL
	 */
	host?: string;

}


/**
 * Base output of the translation services' API calls
 */
interface BaseResult {
	/**
	 * Message to be displayed to the user (not necessarily an error)
	 */
	message?: string;

	/**
	 * HTTP status code of the request
	 */
	status_code?: number;
}

/**
 * Output of the translation function
 */
export interface TranslationResult extends BaseResult {
	/**
	 * Translated text
	 */
	translation?: string;

	/**
	 * Detected language of the input text (if language had to be detected)
	 */
	detected_language?: string;

	/**
	 * Confidence score of the detected language (if language had to be detected)
	 */
	confidence?: number;
}

/**
 * Output of the service validation function
 */
export interface ValidationResult extends BaseResult {
	/**
	 * Boolean indicating whether the service is valid
	 */
	valid: boolean;

	/**
	 * Host that was determined to be used for the service, if applicable
	 */
	host?: string;
}

/**
 * Output of the language fetching function
 */
export interface LanguagesFetchResult extends BaseResult {
	/**
	 * List of languages (locales) that are supported by the service
	 * @remark For Bergamot: this is the list of models that can be downloaded
	 */
	languages?: Array<string> | Array<LanguageModelData>;

	/**
	 * Extra data that is returned by the service (only used by Bergamot to return the most recent version of the model files)
	 */
	data?: string;
}


/**
 * Output of the language detection function
 */
export interface DetectionResult extends BaseResult {
	/**
	 * List of detected languages (locales) of the source text and their confidence scores
	 */
	detected_languages?: Array<{
		/**
		 * Detected language (locale)
		 */
		language?: string;

		/**
		 * Confidence score of the detected language
		 */
		confidence?: number;
	}>;
}


/**
 * Output of the glossary language pair fetching function
 */
export interface GlossaryFetchResult extends BaseResult {
	/**
	 * List of language pairs that are supported by the service
	 * @example
	 * {"en": ["de", "fr"], "de": ["en", "fr"], "fr": ["en", "de"]}*/
	languages?: Record<string, string[]>;
}

/**
 * Output of the glossary upload function
 */
export interface GlossaryUploadResult extends BaseResult {
	/**
	 * IDs of the uploaded glossaries
	 * @example
	 * {"en": "glossary_1", "fr": "glossary_2", ...}*/
	identifiers?: Record<string, string>;
}
