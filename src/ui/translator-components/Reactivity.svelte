<!-- This component handles all updates in the settings/data objects -->

import {DummyTranslate, BingTranslator, GoogleTranslate, BergamotTranslate, Deepl, LibreTranslate, YandexTranslate} from "../../handlers";


<script lang="ts">

	import {onMount} from "svelte";
	import {App, moment} from "obsidian";

	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";

	import type {DownloadableModel, PluginData, TranslatorPluginSettings} from "../../types";
	import {TRANSLATION_SERVICES_INFO} from "../../constants";
	import ISO6391 from "iso-639-1";

	import t from "../../l10n";
	import {BingTranslator, Deepl, DummyTranslate, BergamotTranslate, GoogleTranslate, LibreTranslate, YandexTranslate} from "../../handlers";
	import {aesGcmDecrypt} from "../../util";
	import {PasswordRequestModal} from "../modals";


	export let app: App;
	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	// Set-up observers on service settings
	//   Observing service settings object itself, will cause a trigger to be fired for *any* key value change in the object (undesirable)

	let service_observer: any;
	let api_key_observer: any;
	let host_observer: any;
	let region_observer: any;
	let display_language_observer: any;
	let security_setting_observer: any;

	let filter_type_observer: any;
	let available_languages_observer: any;
	let selected_languages_observer: any;



	// Alright, let me explain. Svelte reactivity is - to call it mildly - slightly wacko.
	//  First of, the reactivity works great... as long as you're not using it on an object;
	//  	if you do decide to use it on an object, ANY change on the object will trigger a reactivity update.
	//      This is fine for rendering, but not when you're trying to minimize the number of requests made to a server.
	//  Luckily, you can fix this by making an observer on the object, which essentially makes a new writeable solely
	//      on that key value. This way, the reactivity will only trigger when the value of the key changes.
	//  Now, this hack ONLY works if the value you're observing is NOT an object (numbers, strings, etc). If you want
	//      to observe an array inside an object, you'll need to check one of its static values (such as its length,
	//      or the value of its first element).

	// FIXME: So great, you managed to reduce the amount of complex operations that are executed each time a key inside
	//  the settings object changes. But now you've introduced a new problem: every change in the settings object
	//  will trigger EACH of the assignments below; sure, it's not as expensive, but this still a major issue.
	$: filter_type_observer = $settings.service_settings[$settings.translation_service].filter_type;
	$: available_languages_observer = $settings.service_settings[$settings.translation_service].available_languages.length;
	$: selected_languages_observer = $settings.service_settings[$settings.translation_service].selected_languages.length;
	$: downloadable_languages_observer = $settings.service_settings[$settings.translation_service].downloadable_models?.length;
	$: api_key_observer = $data.api_key;
	$: host_observer = $settings.service_settings[$settings.translation_service].host;
	$: region_observer = $settings.service_settings[$settings.translation_service].region;
	$: display_language_observer = $settings.display_language;
	$: service_observer = $settings.translation_service;
	$: security_setting_observer = $settings.security_setting;


	export function setupTranslationService() {
		let valid = $settings.service_settings[service_observer]?.validated;

		// FIXME: I quite dislike this particular piece of code, the intention for this is that the user
		// 	gets a warning on startup if the translation service is not validated, but this might get tiresome
		//  pretty fast, maybe this should be reflected in the user interface instead of using a notification.
		// if (plugin.translator && !valid) {
		// 	plugin.message_queue("Please validate the service to use its functionality", 5000, true);
		// }

		if (service_observer === "google_translate")
			plugin.translator = new GoogleTranslate(api_key_observer);
		else if (service_observer === "bing_translator")
			plugin.translator = new BingTranslator(api_key_observer, region_observer);
		else if (service_observer === "yandex_translate")
			plugin.translator = new YandexTranslate(api_key_observer);
		else if (service_observer === "deepl")
			plugin.translator = new Deepl(api_key_observer, host_observer);
		else if (service_observer === "libre_translate")
			plugin.translator = new LibreTranslate(host_observer);
		else if (service_observer === "bergamot")
			plugin.translator = new BergamotTranslate(plugin);
		else
			plugin.translator = new DummyTranslate();

		plugin.translator.valid = valid;
		$data.has_autodetect_capability = plugin.translator.has_autodetect_capability();

		plugin.translator.failure_count_watcher.subscribe(failure_count => {
			if (failure_count >= 10) {
				$settings.service_settings[service_observer].validated = false;
				plugin.translator.valid = false;
				plugin.message_queue("Too many failures: please revalidate the service", 5000, true);
			}
		});
	}

	function getLocales(locales: Array<DownloadableModel> | Array<string>) {
		if (locales instanceof Array<DownloadableModel>)
			// English is the pivot language
			return ['en'].concat(Array.from(locales).map((model: DownloadableModel) => { return model.locale }));
		else
			return locales;
	}

	// Update selection of available languages for the Translation View
	function updateAvailableLanguages() {
		if (filter_type_observer === 0) {
			$data.available_languages = getLocales($settings.service_settings[$settings.translation_service].available_languages);
		} else if (filter_type_observer === 1) {
			$data.available_languages = $data.spellchecker_languages;
		} else if (filter_type_observer === 2) {
			$data.available_languages = Array.from($settings.service_settings[$settings.translation_service].available_languages).map((model: DownloadableModel) => { return model.locale });
		}
	}

	// Fetch names for locales of translation service (this can not be pre-calculated as the set of available languages
	// in a service changes constantly)
	export function updateLanguageNames() {
		let lang = getLocales($settings.service_settings[$settings.translation_service].downloadable_models)
		|| $settings.service_settings[$settings.translation_service].available_languages

		$data.all_languages =
			new Map(Array.from(lang.map((locale: string) => {
					let language: any = locale,
						extra: string = '';
					if (language.contains('-')) {
						[language, extra] = language.split('-');
						extra = t(extra.toUpperCase());
						extra = extra ? ` (${extra})` : '';
					}
					if ($settings.display_language === 'local')
						language = ISO6391.getNativeName(language) || t(language)
					else if ($settings.display_language === 'display')
						language = t(language)
					return [locale, language + extra];
			})))
	}

	function validateAPIKey() {
		if (TRANSLATION_SERVICES_INFO[service_observer].requires_api_key) {
			let invalidated = false;
			let message = '';
			// API key is required but not provided, invalid state
			if (!api_key_observer) {
				invalidated = true;
				message = "No API key was given";

			// Security setting is password but given API key is still encrypted (ends on '=='), invalid state
			} else if ($settings.security_setting === 'password') {
				// FIXME: Not every encrypted key ends with '==' for some reason
				if (api_key_observer.endsWith("==")) {
					invalidated = true;
					message = "Password is still encrypted";
				}
			}
			if (invalidated) {
				$settings.service_settings[service_observer].validated = false;
				plugin.translator.valid = false;
			}
			if (message && !plugin.settings_open)
				plugin.message_queue(message, 5000, true);
		}
	}

	async function getAPIKey(mode: string, service: string) {
		if (mode === "none") {
			return $settings.service_settings[service].api_key;
		} else if (mode === "password") {
			return await aesGcmDecrypt($settings.service_settings[service].api_key, localStorage.getItem('password'));
		} else if (mode === "local_only") {
			return localStorage.getItem(service + '_api_key');
		} else if (mode === "dont_save") {
			return sessionStorage.getItem(service + '_api_key');
		}
	}

	$: {
		if (plugin.translator && plugin.translator.hasOwnProperty('api_key')) {
			plugin.translator.api_key = api_key_observer;
			plugin.translator.success();
			validateAPIKey();
		}
	}

	$: {
		if (plugin.translator && plugin.translator.hasOwnProperty('region')) {
			plugin.translator.region = region_observer;
		plugin.translator.success();
	}
	}

	$: {
		if (plugin.translator && plugin.translator.hasOwnProperty('host')) {
			plugin.translator.host = host_observer;
			plugin.translator.success();
		}
	}

	$: service_observer, setupTranslationService();

	$: filter_type_observer, selected_languages_observer, updateAvailableLanguages();
	$: getAPIKey(security_setting_observer, service_observer).then(x => $data.api_key = x);


	// TWO TRIGGERS:
	//  1. Translation service got changed (different available languages length)
	// 	2. Available languages of translator got updated in settings (different available languages length)
	$: available_languages_observer, updateAvailableLanguages(), updateLanguageNames();
	$: display_language_observer, updateLanguageNames();

	onMount(() => {
		// There is currently no way to catch when the display language of Obsidian is being changed, as it is not reactive
		// So 'display languages' setting will only be applied correctly when the program is fully restarted or when
		// the language display name setting is changed.
		$data.current_language = plugin.fixLanguageCode(moment.locale());

		// @ts-ignore (Config exists in vault)
		if (app.vault.config.spellcheckLanguages) {
			$data.spellchecker_languages = [...new Set(app.vault.config.spellcheckLanguages.map((x) => {
				return x.split('-')[0];
			}))]
			if (filter_type_observer === 1)
				updateAvailableLanguages();
		}

		// FIXME: Not sure how to go about this in a better way, spellchecker languages should not always be included:
		//   users should be able to have a persistent selection of languages. This is hopefully a good compromise:
		//   each time the program is started up, check if the list of selected languages is empty, if so,
		//	 update it with the spellchecker languages; if possible, I would like this to happen ONCE, when the
		// 	 user activates the plugin for the first time ever (and technically possible by adding a 'activated' variable
		//	 inside data), but that seems redundant
		if ($data.spellchecker_languages.length) {
			for (let service in $settings.service_settings) {
				if (!$settings.service_settings[service].selected_languages.length) {
					$settings.service_settings[service].selected_languages = $data.spellchecker_languages;
				}
			}
		}

		// If security mode is 'password', but no password was set on the device, prompt the user to enter the password
		if ($settings.security_setting === 'password') {
			if (!localStorage.getItem('password')) {
				new PasswordRequestModal(plugin).open();
			}
		} else if ($settings.security_setting === 'dont_save') {
			for (let service in $settings.service_settings) {
				// If API key is stored only for session, check if the API key still exists, if not, invalidate service
				if (!sessionStorage.getItem(service + '_api_key'))
					$settings.service_settings[service].validated = null;
			}
		}
	});

</script>
