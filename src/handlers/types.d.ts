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

	/**
	 * Type of model used for translation<br>
	 * <b>Used by:</b> OpenAI Translator
	 */
	model?: string;
}

/**
 * Options for a translation request
 * @remark Defines additional options that can be used by the translation services, if supported
 */
interface ServiceOptions {
	/**
	 * Apply glossary to the translation
	 */
	apply_glossary?: boolean;

	/**
	 * Glossary ID/resource to apply to the translation cloud-side
	 */
	glossary?: string;

	/**
	 * Split translation input into sentences, based on punctuation/newlines
	 * @remark Supported by DeepL
	 * @property { "punctuation" | "newline" | "both" } [split_sentences] - Split sentences based on punctuation or newlines
	 */
	split_sentences?: "none" | "punctuation" | "newline" | "both";

	/**
	 * Preserve formatting of the input text (i.e.: punctuation or upper/lowercase at beginning/end of sentences)
	 * @remark Supported by DeepL
	 */
	preserve_formatting?: boolean;

	/**
	 * Lean towards a more formal/informal translation
	 * @remark Supported by DeepL (pro), Amazon Translate
	 * @property { "more" | "less" } [formality] - Lean towards a more formal/informal translation
	 */
	formality?: "default" | "formal" | "informal";


	/**
	 * Document type of input text
	 * @todo Add support for HTML/XML-like text
	 * @remark Supported by DeepL, Azure, Yandex, Libre Translate
	 */
	text_type?: "plain" | "html";

	/**
	 * Profanity filter for translation
	 * @remark Supported by Azure and Amazon Translate
	 * @todo Add support for profanity filtering
	 * @property { "Marked" | "Deleted" } action - Action to take when profanity is detected
	 * @property { string } [profanity_filter.marker] - Marker to use when profanity is detected (only used when action is "Marked")
	 */
	profanity_filter?: {
		action: "none" | "mark" | "delete";
		marker?: "mask" | "html-tag";
	}

	/**
	 * From script of the input text
	 * @remark Supported by Azure
	 * @todo Add support for non-Latin scripts
	 */
	from_script?: "Latn" | "Cyrl" | "Arab" | "Hebr" | "Hans" | "Hant" | "Jpan" | "Kore" | "Thaa";

	/**
	 * To script of the output text
	 * @remark Supported by Azure
	 * @todo Add support for non-Latin scripts
	 */
	to_script?: "Latn" | "Cyrl" | "Arab" | "Hebr" | "Hans" | "Hant" | "Jpan" | "Kore" | "Thaa";


	/**
	 * Include word alignment of source - translation
	 * @remark Supported by Azure
	 * @todo Add support for word alignment in output
	 */
	word_alignment?: boolean;

	/**
	 * Include sentence alignment of source - translation (length of sentences between source and translation)
	 * @remark Supported by Azure
	 * @todo Add support for sentence alignment in output
	 */
	sentence_alignment?: boolean;


	// TODO: DeepL has five more options, these will be added in once I figure out how to properly integrate XML parsing into
	//  the translation process (i.e.: markdown -> html/xml -> translation -> translated html/xml -> translated markdown)
	//  Use-case example:
	//  		"I have a [English site](https://example.com) I visit"
	//  	--> "I have a <a href="https://example.com">English site</a> I visit"
	//    	--> "Ich habe eine <a href="https://example.com">Englische Seite</a> die ich besuche"
	//    	--> "Ich habe eine [Englische Seite](https://example.com) die ich besuche"
	// Significantly improves translation quality for services that do not know how to handle markdown (e.g. Bergamot),
	// but also adds complexity overhead to the translation process, and might not jive well with very custom markdown
	//
	// Example tags:
	// - tag_handling
	// - non_splitting_tags
	// - outline_detection
	// - splitting_tags
	// - ignore_tags
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

	/**
	 * Whether user has access to the premium tier of the service
	 */
	premium?: boolean;
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
