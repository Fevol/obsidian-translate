import type {LanguageCode} from "iso-639-1";

export interface TranslatorPluginSettings {
	selected_languages: Array<any>;
	use_spellchecker_languages: boolean;
	filter_service_languages: boolean;
	display_language: string;

	language_from: string;
	language_to: string;

	translation_service: string;
	service_settings: APIServiceProviders;
}

export interface PluginData {
	all_languages: Map<LanguageCode, string>;
	available_languages: Array<any>;
	spellchecker_languages: Array<any>;

	current_language: string;

	text_from: string;
	text_to: string;
	detected_language: string;
}

export interface APIServiceProviders {
	google_translate: APIServiceSettings;
	bing_translator: APIServiceSettings;
	yandex_translate: APIServiceSettings;
	libre_translate: APIServiceSettings;
	deepl: APIServiceSettings;
}

export interface APIServiceSettings {
	api_key: string;
	region: string;
	host: string | null;
	auto_translate: boolean;
	auto_translate_interval: string;
	validated: boolean;
	available_languages: Array<string>;
}

export interface KeyedObject {
	[key: string]: any
}
