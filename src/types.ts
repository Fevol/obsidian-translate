import type {Modifier} from "obsidian";

export interface TranslatorPluginSettings {
	security_setting: "none" | "password" | "local_only" | "no_save";
	display_language: "local" | "display";
	filter_mode: string;
	switch_button_action: "switch-both" | "switch-language" | "switch-text";
	apply_glossary: boolean;
	local_glossary: boolean;
	case_insensitive_glossary: boolean;

	translation_service: string;
	service_settings: APIServiceProviders;
	filtered_services: string[];

	default_source_language: string;
	default_target_language: string;

	enable_animations: boolean;

	quicksettings_default: string[];
	layout_default: number;
	left_quickactions_default: string[];
	right_quickactions_default: string[];
	hide_attribution_default: boolean;

	hotkeys: TranslatorHotKey[];
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

	// Available glossary pairs given source language ("en" -> ["fr", "de", ...])
	glossary_languages?: Record<string, string[]>;
	// Which glossaries are currently uploaded to the service, will be removed whenever new glossaries are uploaded
	uploaded_glossaries?: Record<string, string>;

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
	name?: string;
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
	version: string;
}

export interface TranslationResult {
	translation?: string;
	detected_language?: string;
	confidence?: number;
	message?: string;
	status_code?: number;
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



// export interface GlossaryEntry {
// 	source: string;
// 	target: Array<string>;
// }

export interface GlossaryFetchResult {
	languages?: Record<string, string[]>;
	message?: string;
	status_code?: number;
}

export interface GlossaryUploadResult {
	message?: string;
	status_code?: number;
	identifiers?: Record<string, string>;
}


export interface GlossaryResult {
	translation: string;
	detected_language: string;
}

export interface TranslatorHotKey {
	id: string;
	modifiers: Modifier[];
	key: string;
}

// Generic template for commands
export interface CommandI {
	id: string,
	name: string,
	icon: string,
	editor_context?: boolean
	callback?: (...args: any[]) => any;
}
