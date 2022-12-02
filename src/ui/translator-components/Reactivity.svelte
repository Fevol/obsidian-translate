<!-- This component handles all updates in the settings/data objects -->

<script lang="ts">

	import {onMount} from "svelte";
	import {App, Platform} from "obsidian";

	import TranslatorPlugin from "../../main";

	import {settings, data, glossary } from "../../stores";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
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


	export let app: App;
	export let plugin: TranslatorPlugin;

	let service_observer: any;
	let previous_service: string;

	let display_language_observer: any;
	let model_observer: any;

	let active_services = new Map<string, DummyTranslate>();
	let service_uses = new Map<string, number>();

	let all_languages: Set<string>;

	$: service_observer = $settings.translation_service;
	$: filter_mode_observer = $settings.filter_mode;
	$: model_observer = $data.models;
	$: display_language_observer = $settings.display_language;
	$: display_language_observer, updateLocales();


	$: {
		if (service_observer) {
			setTranslationService(service_observer, filter_mode_observer);
		}
	}

	function setAvailableLanguages(translation_service: string, filter_mode: string) {
		const languages = plugin.translator.available_languages || $settings.service_settings[translation_service].available_languages;
		if (filter_mode === "1")
			$data.available_languages = languages.filter(x => $data.spellchecker_languages.includes(x));
		else if (filter_mode === "2")
			$data.available_languages = languages.filter(x => $settings.service_settings[translation_service].selected_languages.includes(x));
		else
			$data.available_languages = languages;
	}

	export function setTranslationService(translation_service: string, filter_mode: string) {
		getTranslationService(translation_service, previous_service).then(service => {
			plugin.translator = service
			previous_service = translation_service;
			setAvailableLanguages(translation_service, filter_mode);
		});
	}

	function updateLocales() {
		$data.all_languages.forEach((language, locale) => $data.all_languages.set(locale, formatLocale(locale)));
	}

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

	export async function getAPIKey(service: string, mode: string) {
		if (mode === 'password')
			return await aesGcmDecrypt($settings.service_settings[service].api_key, $data.password);
		else if (mode === 'local_only')
			return app.loadLocalStorage(`${service}_api_key`);
		else if (mode === 'dont_save')
			return sessionStorage.getItem(`${service}_api_key`);
		else
			return $settings.service_settings[service].api_key;
	}

	export async function setAPIKey(service: string, mode: string, key: string) {
		if (mode === "password")
			$settings.service_settings[service].api_key = await aesGcmEncrypt(key, $data.password);
		else if (mode === "local_only")
			app.saveLocalStorage(service + '_api_key', key);
		else if (mode === "dont_save")
			sessionStorage.setItem(service + '_api_key', key);
		else
			$settings.service_settings[service].api_key = key;
	}


	export function getExistingService(service: string) {
		return active_services[service];
	}

	export function getAllServices(): Map<string, DummyTranslate> {
		return active_services;
	};

	export function unloadService(service: string) {
		service_uses[service] -= 1;
		if (service_uses[service] === 0) {
			delete active_services[service];
			// console.log("UNLOADED SERVICE: " + service);
		}
	}

	export async function getTranslationService(service: string, old_service: string = ''): Promise<DummyTranslate> {
		// Do not attempt to create a service if it does not exist
		if (!service || !(service in SERVICES_INFO)) {
			// console.log("DID NOT FIND SERVICE: " + service);
			return null;
		}

		let translator: DummyTranslate;

		if (service in active_services) {
			translator = active_services[service];
			service_uses[service] += 1;
			// console.log("LOADING SERVICE: ", service, " (", service_uses[service], "uses)");
		} else {
			// If translation service data does not exist in settings, ensure that it is loaded with default values
			if (!$settings.service_settings[service])
				$settings.service_settings[service] = DEFAULT_SETTINGS.service_settings[service];

			const service_settings = $settings.service_settings[service];
			// console.log("CREATING SERVICE: ", service);

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
				translation_service = new BergamotTranslate('fasttext' in active_services ? active_services['fasttext'] : await getTranslationService('fasttext', ''),
					plugin, $data.models?.bergamot);
			else if (service === "amazon_translate")
				translation_service = new AmazonTranslate(service_settings);
			else if (service === "lingva_translate")
				translation_service = new LingvaTranslate(service_settings);
			else if (service === 'fasttext')
				translation_service = new FastTextDetector(plugin, $data.models?.fasttext);
			else if (service === "fanyi_youdao")
				translation_service = new FanyiYoudao(service_settings);
			else if (service === "fanyi_qq")
				translation_service = new FanyiQq(service_settings);
			else if (service === "fanyi_baidu")
				translation_service = new FanyiBaidu(service_settings);


			if ($settings.security_setting !== 'none' && SERVICES_INFO[service].requires_api_key)
				translation_service.api_key = await getAPIKey(service, $settings.security_setting);

			if (service !== 'bergamot' && service !== 'fasttext') {
				translation_service.valid &&= $settings.service_settings[service].validated;
				translation_service.failure_count_watcher.subscribe(failure_count => {
					if (failure_count >= 5) {
						$settings.service_settings[service].validated = false;
						translation_service.valid = false;
						plugin.message_queue(`Too many failures: please revalidate ${SERVICES_INFO[service].display_name}`, 5000, true);
					}
				});
			}

			// To be honest, I'm actually not sure whether it would be more efficient to just load all the locales,
			// instead of going through them... one... by... one...
			if (service === "bergamot") {
				$data.all_languages.set("en", formatLocale("en"));
				$settings.service_settings["bergamot"].downloadable_models
					.map(m => m.locale)
					.forEach(locale => {
						$data.all_languages.set(locale, formatLocale(locale));
					});
			} else if ($settings.service_settings[service]?.available_languages) {
				$settings.service_settings[service].available_languages
					.filter(locale => !$data.all_languages.has(locale))
					.forEach(locale => {
						$data.all_languages.set(locale, formatLocale(locale))
					});
			}

			active_services[service] = translation_service;
			translator = translation_service;
			service_uses[service] = 1;
		}

		if (old_service)
			service_uses[old_service] -= 1;
		if (old_service && old_service !== service && !service_uses[old_service]) {
			delete active_services[old_service];
			// console.log("UNLOADED SERVICE: " + old_service);
		}
		return translator;
	}


	$: {
		if (Object.keys(model_observer).length)
			app.saveLocalStorage('models', JSON.stringify(model_observer));
	}

	function updateSpellcheckerLanguages() {
		$data.spellchecker_languages = [...new Set(app.vault.config.spellcheckLanguages.map((x) => {
			return x.split('-')[0];
		}))];
	}

	export function filterAvailableServices() {
		let available_services = ALL_SERVICES;
		if (Platform.isMobile)
			available_services = available_services.filter(service => !SERVICES_INFO[service].desktop_only);
		if ($settings.filtered_services.length)
			available_services = available_services.filter(service => $settings.filtered_services.includes(service));
		$data.available_services = available_services;
		if (!$data.available_services.includes($settings.translation_service))
			$settings.translation_service = $data.available_services[0];
	}

	onMount(async () => {
		if (app.vault.config.spellcheckLanguages)
			$data.spellchecker_languages = [...new Set(app.vault.config.spellcheckLanguages.map(x => x.split('-')[0]))]
		else
			// Mobile (iOS and Android) do not have spellchecker languages available (assume display language)
			$data.spellchecker_languages = [plugin.current_language];

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
		if ($data.spellchecker_languages.length) {
			for (let service in $settings.service_settings) {
				if ($settings.service_settings[service].selected_languages !== undefined && !$settings.service_settings[service].selected_languages.length) {
					$settings.service_settings[service].selected_languages = $data.spellchecker_languages;
				}
			}
		}

		// If security mode is 'password', but no password was set on the device, prompt the user to enter the password
		// 	at startup of plugin, this prompt can also be opened in settings
		if ($settings.security_setting === 'password') {
			for (const [service, service_settings] of Object.entries($settings.service_settings)) {
				if (SERVICES_INFO[service].requires_api_key && service_settings.api_key) {
					if ((await aesGcmDecrypt(service_settings.api_key, $data.password)).endsWith('==')) {
						$data.password_are_encrypted = true;
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


		if (!plugin.detector && ($settings.apply_glossary || $settings.local_glossary || $settings.service_settings?.fasttext?.default_usage)) {
			plugin.detector = await getTranslationService('fasttext');
			if ($settings.service_settings?.fasttext?.default_usage)
				plugin.detector.default = true;
		}

		if ($settings.apply_glossary || $settings.local_glossary) {
			let loaded_glossaries: any = await app.vault.adapter.read(".obsidian/plugins/obsidian-translate/glossary.json");
			if (loaded_glossaries) {
				glossary.dicts = JSON.parse(loaded_glossaries);
				for (let key in glossary.dicts) {
					glossary.replacements[key] = new RegExp(glossary.dicts[key].map((item) => item[0]).join("|"),
					$settings.case_insensitive_glossary ? "gi" : "g");
				}
			}
		}

		glossary.source_language = plugin.current_language;
		glossary.target_language = $settings.default_target_language;
	});
</script>
