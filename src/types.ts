export interface TranslatorPluginSettings {
	security_setting: "none" | "password" | "local_only" | "no_save";
	display_language: "local" | "display";
	filter_mode: string;
	switch_button_action: "switch-both" | "switch-language" | "switch-text";

	translation_service: string;
	service_settings: APIServiceProviders;

	default_source_language: string;
	default_target_language: string;

	enable_animations: boolean;
	hide_attribution: boolean;

	// Where the local models are stored, if applicable
	storage_path?: string;
}

export interface PluginData {
	// Cache the available language locales, and their corresponding names
	all_languages: Map<string, string>;

	// Which languages can be translated to and from for default translation service (with filters applied)
	available_languages: Array<any>;

	// Current spellchecker languages (synced at startup of the plugin)
	spellchecker_languages: Array<any>;

	// Installed models of the current vault (used for Bergamot and FastText)
	models: Models;

	// Selected tab of the settings page
	tab: string;

	// If any of the services API keys are still encrypted, this will be true
	password_are_encrypted: boolean;

	// This will be used to make password difference operations reactive
	password: string;
}

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

export interface APIServiceSettings {
	// What languages did the user select? (locale codes)
	selected_languages: Array<any>;
	// What languages are available for *this translation service* (locale codes)
	available_languages: Array<string> | Array<LanguageModelData>;

	downloadable_models?: Array<LanguageModelData>;
	version?: string;

	// Authentication settings for translation services
	api_key?: string;
	app_id?: string;
	region?: string;
	host?: string;

	// Automatically translate the text when the user types
	auto_translate: boolean;

	// Determine how long to wait before translating the text
	auto_translate_interval: number;

	// Whether the translation service is validated (current authentication settings are valid)
	validated: boolean;
}

export interface FileData {
	name: string;
	size: number;
	usage?: string;
}

export interface LanguageModelData {
	locale?: string;
	files?: Array<FileData>;
	dev?: boolean;
	size?: number;
}

export interface ModelFileData {
	version?: string;
	binary?: FileData;
	models?: Array<LanguageModelData>;
}

export interface Models {
	fasttext?: ModelFileData;
	bergamot?: ModelFileData;
}

export interface FastTextData {
	default_usage: boolean;
}

export interface TranslationResult {
	translation?: string;
	detected_language?: string;
	message?: string;
	status_code?: number;
	confidence?: number;
}

export interface ValidationResult {
	valid: boolean;
	host?: string;
	message?: string;
	status_code?: number;
}

export interface LanguagesFetchResult {
	languages?: Array<string> | Array<LanguageModelData>;
	message?: string;
	data?: string;
	status_code?: number;
}


export interface DetectionResult {
	detected_languages?: Array<{
		language?: string;
		confidence?: number;
	}>;
	message?: string;
	status_code?: number;
}
