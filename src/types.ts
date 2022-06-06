export interface TranslatorPluginSettings {
	selected_languages: Array<any>;
	available_languages: Array<any>;
	use_spellchecker_languages: boolean;
	display_language: string;
	language_from: string;
	language_to: string;
	translation_service: string;
	service_settings: APIServiceProviders;
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
	host: string | null;
}
