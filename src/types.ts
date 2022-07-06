export interface TranslatorPluginSettings {
	security_setting: "none" | "password" | "local_only" | "no_save";

	display_language: "local" | "display";

	language_from: string;
	language_to: string;

	view_mode: number;

	translation_service: string;
	service_settings: APIServiceProviders;


	// Where the local models are stored, if applicable
	storage_path?: string;
}

export interface PluginData {
	// Cache the available language locales, and their corresponding names
	all_languages: Map<string, string>;
	api_key: string;

	// Which languages can be selected for translation (unfiltered)
	available_languages: Array<any>;

	// Current spellchecker languages (synced at startup of the plugin)
	spellchecker_languages: Array<any>;

	// Current display language of Obsidian (synced at startup of the plugin)
	current_language: string;

	text_from: string;
	text_to: string;
	detected_language: string;
	has_autodetect_capability: boolean;
}

export interface APIServiceProviders {
	google_translate: APIServiceSettings;
	bing_translator: APIServiceSettings;
	yandex_translate: APIServiceSettings;
	libre_translate: APIServiceSettings;
	deepl: APIServiceSettings;
	bergamot: APIServiceSettings;
	fasttext: FastTextData;
}

export interface ModelDatasets {
	model?: string;
	lex?: string;
	vocab?: string;
	trgvocab?: string;
	srcvocab?: string;
}

export interface ModelData {
	from: ModelDatasets;
	to: ModelDatasets;
}

export interface DownloadableModel {
	locale: string;
	size: number;
	development: boolean;
	files: ModelData;
}

export interface APIServiceSettings {
	// What languages did the user select? (locale codes)
	selected_languages: Array<any>;
	// What languages are available for *this translation service* (locale codes)
	available_languages: Array<string> | Array<DownloadableModel>;

	downloadable_models?: Array<DownloadableModel>;
	version?: string;

	// Which languages get shown in the translation view selection box
	// (0 = all, 1 = synced with spell checker, 2 = only selected languages)
	filter_type: number;

	// Authentication settings for translation services
	api_key?: string;
	region?: string;
	host?: string;

	// Automatically translate the text when the user types
	auto_translate: boolean;

	// Determine how long to wait before translating the text
	auto_translate_interval: number;

	// Whether the translation service is validated (current authentication settings are valid)
	validated: boolean;
}

export interface FastTextData {
	default_usage: boolean;
}

export interface TranslationResult {
	translation?: string;
	detected_language?: string;
	message?: string;
}

export interface ValidationResult {
	valid: boolean;
	host?: string;
	message?: string;
}

export interface LanguagesFetchResult {
	languages?: Array<string> | Array<DownloadableModel>;
	message?: string;
	data?: string;
}

export interface DetectionResult {
	language?: string;
	confidence?: number;
	message?: string;

}
