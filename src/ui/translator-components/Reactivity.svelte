<!-- This component handles all updates in the settings/data objects -->

<script lang="ts">

	import {onMount} from "svelte";
	import {Platform} from "obsidian";

	import TranslatorPlugin from "../../main";

	import {
		settings,
		glossary,
		available_languages,
		spellcheck_languages,
		all_languages,
		password,
		bergamot_data, fasttext_data, available_services, passwords_are_encrypted
	} from "../../stores";

	import {SERVICES_INFO, DEFAULT_SETTINGS, ALL_SERVICES} from "../../constants";
	import ISO6391 from "iso-639-1";

	import t from "../../l10n";
	import {
		AzureTranslator,
		Deepl,
		DummyTranslate,
		BergamotTranslate,
		GoogleTranslate,
		LibreTranslate,
		YandexTranslate,
		FanyiQq,
		FanyiYoudao,
		FanyiBaidu,
		AmazonTranslate,
		LingvaTranslate,
		FastTextDetector,
	} from "../../handlers";
	import {aesGcmDecrypt, aesGcmEncrypt, toTitleCase} from "../../util";
	import {PasswordRequestModal} from "../modals";


	export let plugin: TranslatorPlugin;

	let service_observer: any;
	let previous_service: string;

	let display_language_observer: any;

	let active_services = new Map<string, DummyTranslate>();
	let service_uses = new Map<string, number>();

	$: service_observer = $settings.translation_service;
	$: filter_mode_observer = $settings.filter_mode;
	$: display_language_observer = $settings.display_language;
	$: display_language_observer, updateLocales();


	$: {
		// Whenever the global translation service changes, load in the new service
		if (service_observer) {
			setTranslationService(service_observer, filter_mode_observer);
		}
	}

	/**
	 * Update the available locales (available_languages) for the global service
	 * @param translation_service - Translation service for which to update the locales
	 * @param filter_mode - Filter locales by the filter mode
	 */
	function setAvailableLanguages(translation_service: string, filter_mode: string) {
		const languages = plugin.translator.available_languages || $settings.service_settings[translation_service].available_languages;
		if (filter_mode === "1")
			$available_languages = languages.filter(x => $spellcheck_languages.includes(x));
		else if (filter_mode === "2")
			$available_languages = languages.filter(x => $settings.service_settings[translation_service].selected_languages.includes(x));
		else
			$available_languages = languages;
	}

	/**
	 * Set the global translation service
	 * @param translation_service - Translation service to set
	 * @param filter_mode - Mode to filter the service's locales by
	 */
	export function setTranslationService(translation_service: string, filter_mode: string) {
		getTranslationService(translation_service, previous_service).then(service => {
			plugin.translator = service
			previous_service = translation_service;
			setAvailableLanguages(translation_service, filter_mode);
		});
	}

	/**
	 * Get display language for all locales based on the set display_language setting
	 */
	function updateLocales() {
		$all_languages.forEach((language, locale) => $all_languages.set(locale, formatLocale(locale)));
	}

	/**
	 * Format a locale based on the set display_language setting
	 * @param locale - Locale to format
	 */
	function formatLocale(locale) {
		let language: any = locale,
			extra: string = '';
		if (language.contains('-')) {
			[language, extra] = language.split('-');
			extra = t(extra.toUpperCase());
			extra = extra ? ` (${extra})` : '';
		}

		if ($settings.display_language === 'local')
			language = ISO6391.getNativeName(language) || t(language);
		else if ($settings.display_language === 'display')
			language = t(language);

		return language + extra;
	}

	/**
	 * Get the API key for a translation service
	 * @param service - Translation service to get the API key for
	 * @param mode - The way the API key is stored ('none' | 'password' | 'local_only' | 'dont_save')
	 */
	export async function getAPIKey(service: string, mode: string) {
		if (mode === 'password')
			return await aesGcmDecrypt($settings.service_settings[service].api_key, $password);
		else if (mode === 'local_only')
			return app.loadLocalStorage(`${service}_api_key`);
		else if (mode === 'dont_save')
			return sessionStorage.getItem(`${service}_api_key`);
		else
			return $settings.service_settings[service].api_key;
	}

	/**
	 * Properly store the new API key of a translation service
	 * @param service - Translation service to store the API key for
	 * @param mode - The way the API key should be stored ('none' | 'password' | 'local_only' | 'dont_save')
	 * @param key - The API key to store
	 */
	export async function setAPIKey(service: string, mode: string, key: string) {
		if (mode === "password")
			$settings.service_settings[service].api_key = await aesGcmEncrypt(key, $password);
		else if (mode === "local_only")
			app.saveLocalStorage(service + '_api_key', key);
		else if (mode === "dont_save")
			sessionStorage.setItem(service + '_api_key', key);
		else
			$settings.service_settings[service].api_key = key;
	}


	/**
	 * Get a translation service by name without loading it
	 * @param service - Translation service to get
	 * @returns Translator object is it was already loaded, otherwise null
	 */
	export function getExistingService(service: string) {
		return active_services[service];
	}

	/**
	 * Get all loaded translation services
	 * @returns Map of all loaded translation services
	 */
	export function getAllServices(): Map<string, DummyTranslate> {
		return active_services;
	}

	/**
	 * Unload a translation service
	 * @param service - Translation service to unload
	 */
	export function unloadService(service: string) {
		service_uses[service] -= 1;
		if (service_uses[service] === 0) {
			delete active_services[service];
			// console.log("UNLOADED SERVICE: " + service);
		}
	}

	/**
	 * Get a translation service by name if it is already loaded, otherwise load it, manages active services
	 * @param service - Translation service to get
	 * @param old_service - Previously set translation service (default: '')
	 * @returns Translator object
	 */
	export async function getTranslationService(service: string, old_service: string = ''): Promise<DummyTranslate> {
		// Do not attempt to create a service if it does not exist
		if (!service || !(service in SERVICES_INFO)) {
			return null;
		}

		let translator: DummyTranslate;

		if (service in active_services) {
			translator = active_services[service];
			service_uses[service] += 1;
		} else {
			// If translation service data does not exist in settings, ensure that it is loaded with default values
			if (!$settings.service_settings[service])
				$settings.service_settings[service] = DEFAULT_SETTINGS.service_settings[service];

			const service_settings = $settings.service_settings[service];
			if ($settings.security_setting !== 'none' && SERVICES_INFO[service].requires_api_key)
				service_settings.api_key = await getAPIKey(service, $settings.security_setting);

			let translation_service: DummyTranslate = null;

			if (service === "google_translate")
				translation_service = new GoogleTranslate(service_settings);
			else if (service === "azure_translator")
				translation_service = new AzureTranslator(service_settings);
			else if (service === "yandex_translate")
				translation_service = new YandexTranslate(service_settings);
			else if (service === "deepl")
				translation_service = new Deepl(service_settings);
			else if (service === "libre_translate")
				translation_service = new LibreTranslate(service_settings);
			else if (service === "bergamot")
				translation_service = new BergamotTranslate('fasttext' in active_services ? active_services['fasttext'] :
											await getTranslationService('fasttext', ''), plugin, $bergamot_data);
			else if (service === "amazon_translate")
				translation_service = new AmazonTranslate(service_settings);
			else if (service === "lingva_translate")
				translation_service = new LingvaTranslate(service_settings);
			else if (service === 'fasttext')
				translation_service = new FastTextDetector($fasttext_data);
			else if (service === "fanyi_youdao")
				translation_service = new FanyiYoudao(service_settings);
			else if (service === "fanyi_qq")
				translation_service = new FanyiQq(service_settings);
			else if (service === "fanyi_baidu")
				translation_service = new FanyiBaidu(service_settings);

			if (service !== 'bergamot' && service !== 'fasttext') {
				translation_service.valid &&= $settings.service_settings[service].validated;
				translation_service.failure_count_watcher.subscribe(failure_count => {
					// Automatically disable service if it fails too many times
					if (failure_count >= 5) {
						$settings.service_settings[service].validated = false;
						translation_service.valid = false;
						plugin.message_queue(`Too many failures: please revalidate ${SERVICES_INFO[service].display_name}`, 5000, true);
					}
				});
			}

			// This code adds in the locales of the service to the list of all locales ($all_languages)
			// and also sets the locales to the internal list of locales for the service (translation_service.available_languages)
			if (service === "bergamot") {
				$all_languages.set("en", formatLocale("en"));
				$settings.service_settings["bergamot"].downloadable_models
					.map(m => m.locale)
					.forEach(locale => {
						$all_languages.set(locale, formatLocale(locale));
					});
				translation_service.available_languages = $bergamot_data.models ? ["en", ...$bergamot_data.models.map(m => m.locale)] : ["en"];
			} else if ($settings.service_settings[service]?.available_languages) {
				$settings.service_settings[service].available_languages
					.filter(locale => !$all_languages.has(locale))
					.forEach(locale => {
						$all_languages.set(locale, formatLocale(locale))
					});
				translation_service.available_languages = $settings.service_settings[service].available_languages;
			}

			// Provide default options to the service
			translation_service.options = {
				split_sentences: service_settings.split_sentences,
				preserve_formatting: service_settings.preserve_formatting,
				formality: service_settings.formality,
				profanity_filter: service_settings.profanity_filter,
			}

			active_services[service] = translation_service;
			translator = translation_service;
			service_uses[service] = 1;
		}

		// Manage uses of old service and unload if necessary
		if (old_service)
			service_uses[old_service] -= 1;
		if (old_service && old_service !== service && !service_uses[old_service]) {
			delete active_services[old_service];
		}
		return translator;
	}


	// Save model data to localstorage if it was updated
	$: {
		if ($bergamot_data && Object.values($bergamot_data).some(v => !(v == null)))
			app.saveLocalStorage('bergamot', JSON.stringify($bergamot_data));
		else
			localStorage.removeItem(`${app.appId}-bergamot`);
	}

	$: {
		if ($fasttext_data && Object.values($fasttext_data).some(v => !(v == null)))
			app.saveLocalStorage('fasttext', JSON.stringify($fasttext_data));
		else
			localStorage.removeItem(`${app.appId}-fasttext`);
	}

	/**
	 * Update the spellchecker languages writable store by the new spellchecker languages setting
	 */
	function updateSpellcheckerLanguages() {
		$spellcheck_languages = [...new Set(app.vault.config.spellcheckLanguages.map((x) => {
			return x.split('-')[0];
		}))];
	}

	/**
	 * Filter the available services that the user can select from and is able to change the settings of
	 */
	export function filterAvailableServices() {
		let new_available_services = ALL_SERVICES;
		if (Platform.isMobile)
			new_available_services = new_available_services.filter(service => !SERVICES_INFO[service].desktop_only);
		if ($settings.filtered_services.length)
			new_available_services = new_available_services.filter(service => $settings.filtered_services.includes(service));
		$available_services = new_available_services;
		if (!$available_services.includes($settings.translation_service))
			$settings.translation_service = $available_services[0];
	}

	onMount(async () => {
		if (app.vault.config.spellcheckLanguages)
			$spellcheck_languages = [...new Set(app.vault.config.spellcheckLanguages.map(x => x.split('-')[0]))]
		else
			// Mobile (iOS and Android) do not have spellchecker languages available (assume display language)
			$spellcheck_languages = [plugin.current_language];

		// FIXME: This is not an ideal solution, as config-changed gets called quite a bit
		// Whenever config of spellchecker languages changed, update its list
		plugin.registerEvent(app.vault.on('config-changed', () => {
			if (app.vault.config.spellcheckLanguages) {
				updateSpellcheckerLanguages();
				if ($settings.filter_mode === "1")
					setAvailableLanguages(service_observer, filter_mode_observer);
			}
		}));


		// TODO: This can be done each time you add default service settings
		if ($spellcheck_languages.length) {
			for (let service in $settings.service_settings) {
				if ($settings.service_settings[service].selected_languages !== undefined && !$settings.service_settings[service].selected_languages.length) {
					$settings.service_settings[service].selected_languages = $spellcheck_languages;
				}
			}
		}

		// If security mode is 'password', but no password was set on the device, prompt the user to enter the password
		// 	at startup of plugin, this prompt can also be opened in settings
		if ($settings.security_setting === 'password') {
			for (const [service, service_settings] of Object.entries($settings.service_settings)) {
				if (SERVICES_INFO[service].requires_api_key && service_settings.api_key) {
					if ((await aesGcmDecrypt(service_settings.api_key, $password)).endsWith('==')) {
						$passwords_are_encrypted = true;
						new PasswordRequestModal(plugin).open();
						break;
					}
				}
			}
		} else if ($settings.security_setting === 'dont_save') {
			for (let service in $settings.service_settings) {
				// If API key is stored only for session, check if the API key still exists, if not, invalidate service
				if (!sessionStorage.getItem(service + '_api_key'))
					$settings.service_settings[service].validated = null;
			}
		}

		// Give user a warning if their default translation service is not available anymore
		if (Platform.isMobile && SERVICES_INFO[$settings.translation_service].desktop_only) {
			plugin.message_queue(`${toTitleCase($settings.translation_service)} is currently not supported on mobile devices, defaulting to first available service`, 5000, true);
		}
		filterAvailableServices();


		if (!plugin.detector && ($settings.apply_glossary || $settings.service_settings?.fasttext?.default_usage)) {
			plugin.detector = await getTranslationService('fasttext');
			if ($settings.service_settings?.fasttext?.default_usage)
				plugin.detector.default = true;
		}

		let loaded_glossaries = null;

		// Glossary will always be loaded in on plugin load, even if it is not used (slight performance hit)
		if (await app.vault.adapter.exists(`${app.vault.configDir}/plugins/translate/glossary.json`))
			loaded_glossaries = await app.vault.adapter.read(`${app.vault.configDir}/plugins/translate/glossary.json`);
		if (loaded_glossaries) {
			glossary.dicts = JSON.parse(loaded_glossaries);
			for (let key in glossary.dicts) {
				glossary.replacements[key] = new RegExp(glossary.dicts[key].map((item) => item[0]).join("|"),
				$settings.case_insensitive_glossary ? "gi" : "g");
			}
		}

		glossary.source_language = plugin.current_language;
		glossary.target_language = $settings.default_target_language;
	});
</script>
