import type {Modifier} from "obsidian";
import type {ServiceOptions} from "./handlers/types";

/**
 * Object containing all plugin settings
 */
export interface TranslatorPluginSettings {
	/**
	 * Version of the settings file
	 */
	version: string;

	/**
	 * How API keys are stored on the device
	 * - "none" - API keys are stored in plaintext in data.json
	 * - "password" - API keys are stored in encrypted form in data.json
	 * - "local_only" - API keys are stored in the device's local storage
	 * - "no_save" - API keys are stored for the current session only
	 */
	security_setting: "none" | "password" | "local_only" | "no_save";

	/**
	 * In what language the language locales should be displayed
	 * - "local" will display the name of the language in the language itself
	 * - "display" will display the name of the language in English
	 */
	display_language: "local" | "display";

	/**
	 * Determines which languages are available for the global translator
	 * - "0" - All languages, no filtering
	 * - "1" - Only the languages that are also in Obsidian's spellchecker language list
	 * - "2" - Only the languages that were manually selected in the service's settings
	 */
	filter_mode: string;

	/**
	 * The action that will be performed on the two textareas of the translation view, on click of the "Switch Language" button
	 * - "switch-both" - Switch both the languages and text
	 * - "switch-language" - Switch only the languages
	 * - "switch-text" - Switch only the text
	 */
	switch_button_action: "switch-both" | "switch-language" | "switch-text";

	/**
	 * If true, glossary operation is enabled
	 */
	apply_glossary: boolean;

	/**
	 * @deprecated
	 * If true and the glossary operation is enabled, the local glossary will be applied before the online glossary
	 */
	local_glossary: boolean;

	/**
	 * Determines which glossaries will be applied when translating
	 * - "both" - Online glossary if applied first, if it is not available, the local glossary will be applied
	 * - "online" - Only the online glossary will be applied
	 * - "local" - Only the local glossary will be applied
	 */
	glossary_preference: "both" | "online" | "local";

	/**
	 * If true, make the local glossary look-up case-insensitive (/Hello/ matches "hello" and "Hello")
	 */
	case_insensitive_glossary: boolean;

	/**
	 * The translation service that is used for the global translator, must exist in the services list
	 */
	translation_service: string;

	/**
	 * Object containing all services settings (API keys, etc.)
	 */
	service_settings: APIServiceProviders;

	/**
	 * List of services that can be selected as a translation service and that will be visible in the settings
	 */
	filtered_services: string[];

	/**
	 * Default source language that will be opened in the translation view
	 * @remark <i>Not</i> used for determining which language to translate from for translation operations
	 */
	default_source_language: string;

	/**
	 * Determine how default target language is chosen
	 * - "last" - The last target language that was used
	 * - "display" - Obsidian's display language
	 * - "specific" - User-specified language
	 */
	target_language_preference: "last" | "display" | "specific";

	/**
	 * List of most recently used target languages
	 * @remark Will only keep track of the last three languages
	 */
	last_used_target_languages: string[];


	/**
	 * Default target language that will be opened in the translation view and shown first for translation operations
	 */
	default_target_language: string;

	/**
	 * Visual setting: whether to enable animations plugin-wide (default: true)
	 */
	enable_animations: boolean;

	/**
	 * Determines which quicksettings will be available by default on opening the translation view<br>
	 * <b>Options:</b> ["change-service", "automatic-translation", "apply-glossary", "change-layout", "apply-filter", "open-settings"]  (reference QUICK_SETTINGS ct.)
	 */
	quicksettings_default: string[];

	/**
	 * Determines with layout will be used by default on opening the translation view<br>
	 * <b>Options:</b> ["automatic", "horizontal", "vertical", "split"]  (reference VIEW_MODES ct.)
	 */
	layout_default: number;

	/**
	 * Determines which quick actions will be available by default on the left textarea of the translation view<br>
	 * <b>Options:</b> ["copy", "paste", "clear"]  (reference QUICK_ACTIONS ct.)
	 */
	left_quickactions_default: string[];

	/**
	 * Determines which quick actions will be available by default on the right textarea of the translation view<br>
	 * <b>Options:</b> ["copy", "paste", "clear"]  (reference QUICK_ACTIONS ct.)
	 */
	right_quickactions_default: string[];

	/**
	 * Determines whether the attribution info will be shown by default on opening the translation view
	 */
	hide_attribution_default: boolean;

	/**
	 * Users that the user has set for the plugin
	 */
	hotkeys: TranslatorHotKey[];

	/**
	 * Store term in glossary for both translation directions
	 */
	glossary_bidirectional: boolean;
}

/**
 * Object containing the settings for all API services
 */
export interface APIServiceProviders {
	google_translate: APIServiceSettings;
	azure_translator: APIServiceSettings;
	yandex_translate: APIServiceSettings;
	libre_translate: APIServiceSettings;
	deepl: APIServiceSettings;
	fanyi_qq: APIServiceSettings;
	fanyi_youdao: APIServiceSettings;
	fanyi_baidu: APIServiceSettings;
	/*amazon_translate: APIServiceSettings;*/
	lingva_translate: APIServiceSettings;
	bergamot: APIServiceSettings;
	fasttext: FastTextData;
}

/**
 * Object containing the settings for a single API service
 */
export interface APIServiceSettings extends ServiceOptions {
	/**
	 * List of user-selected languages (locales) that will be available with the 'manually_selected' <i>(2)</i> filter mode
	 */
	selected_languages: Array<any>;

	/**
	 * List of languages (locales) that are supported by the service
	 * @remark For Bergamot: this is the list of models that are available for the service
	 */
	available_languages: Array<string> | Array<LanguageModelData>;

	/**
	 * List of glossary pairs that are available for the service
	 * @example
	 * {"en": ["fr", "de", ...]}*/
	glossary_languages?: Record<string, string[]>;

	/**
	 * Mapping of language locale to uploaded glossary ID, will be removed on upload of new set of glossaries
	 * @example
	 * {"en": "glossary_1", "fr": "glossary_2", ...}*/
	uploaded_glossaries?: Record<string, string>;

	/**
	 * Only used for Bergamot: list of models that can be downloaded
	 */
	downloadable_models?: Array<LanguageModelData>;

	/**
	 * Version of the translation service settings, if the stored version is lower than the default version, new defaults will be added to the settings
	 */
	version?: string;

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
	 * If enabled, allow the user to automatically translate in the translation view
	 * @remark The reason for the two-step procedure, is that automatically translating can use up your API quota very quickly
	 */
	auto_translate: boolean;

	/**
	 * Determine the time in milliseconds to wait from the last keypress before automatically translating in the translation view
	 */
	auto_translate_interval: number;

	/**
	 * Whether the translation service is validated (current authentication settings are valid)
	 */
	validated: boolean;
}

/**
 * Object containing the data for a single file
 */
export interface FileData {
	/**
	 * The file's name
	 */
	name: string;

	/**
	 * The size of the file in bytes
	 */
	size: number;

	/**
	 * Whether this file is used for a specific language pair, or shared between multiple language pairs
	 * <b>Options:</b> ["from", "to", "both"]
	 */
	usage?: string;
}

/**
 * Object containg the model data for a single language model
 */
export interface LanguageModelData {
	name?: string;

	/**
	 * Locale associated with the language model
	 */
	locale?: string;

	/**
	 * List of model files associated with the language model
	 */
	files?: Array<FileData>;

	/**
	 * Whether the language model is in beta (according to Bergamot developers)
	 */
	dev?: boolean;

	/**
	 * The total size of the language model in bytes (sum of all files)
	 */
	size?: number;
}

/**
 * Object containing all the model data for a local service (FastText/Bergamot)
 */
export interface ModelFileData {
	/**
	 * Current version of downloaded model files
	 */
	version?: string;

	/**
	 * Worker binary of the service (FastText/Bergamot)
	 */
	binary?: FileData;

	/**
	 * Installed model files as supplementary files for the worker binary
	 */
	models?: Array<LanguageModelData>;
}

/**
 * Settings for the FastText service
 */
export interface FastTextData {
	/**
	 * If true, FastText will be used as the default language detection service
	 */
	default_usage: boolean;

	/**
	 * Version of the translation service settings, if the stored version is lower than the default version, new defaults will be added to the settings
	 */
	version: string;
}




/**
 * Hotkey data for a single hotkey
 */
export interface TranslatorHotKey {
	/**
	 * Unique ID of the hotkey
	 */
	id: string;

	/**
	 * Active modifier keys for the hotkey
	 */
	modifiers: Modifier[];

	/**
	 * Key name of the hotkey
	 */
	key: string;
}


/**
 * Generic template for an Obsidian command
 */
export interface CommandI {
	/**
	 * Unique ID of the command
	 */
	id: string,

	/**
	 * Display name of the command
	 */
	name: string,

	/**
	 * Icon to be displayed next to the command (only used for mobile toolbar)
	 */
	icon: string,

	/**
	 * Whether the command requires editor context (active note)
	 */
	editor_context?: boolean

	/**
	 * Callback function for the command
	 * @param args - Set of arguments passed to the command
	 */
	callback?: (...args: any[]) => any;

	editorCallback?: (...args: any[]) => any;
}
