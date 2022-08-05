<!-- This component handles all updates in the settings/data objects -->

<script lang="ts">

	import {onMount} from "svelte";
	import {App, moment, Platform} from "obsidian";

	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";

	import type { PluginData, TranslatorPluginSettings} from "../../types";
	import {setAvailableServices, SERVICES_INFO} from "../../constants";
	import ISO6391 from "iso-639-1";

	import t from "../../l10n";
	import {
		BingTranslator,
		Deepl,
		DummyTranslate,
		BergamotTranslate,
		GoogleTranslate,
		LibreTranslate,
		YandexTranslate,
		FanyiQq,
		FanyiYoudao,
		AmazonTranslate,
		LingvaTranslate,
		FastTextDetector
	} from "../../handlers";
	import {aesGcmDecrypt, toTitleCase} from "../../util";
	import {PasswordRequestModal} from "../modals";


	export let app: App;
	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	let service_observer: any;
	let previous_service: string;

	let display_language_observer: any;
	let model_observer: any;

	let active_services = new Map<string, DummyTranslate>();
	let service_uses = new Map<string, number>();

	let all_languages: Set<string>;

	// Alright, let me explain. Svelte reactivity is - to call it mildly - slightly wacko.
	//  First of, the reactivity works great... as long as you're not using it on an object;
	//  	if you do decide to use it on an object, ANY change on the object will trigger a reactivity update.
	//      This is fine for rendering, but not when you're trying to minimize the number of requests made to a server.
	//  Luckily, you can fix this by making an observer on the object, which essentially makes a new writeable solely
	//      on that key value. This way, the reactivity will only trigger when the value of the key changes.
	//  Now, this hack ONLY works if the value you're observing is NOT an object (numbers, strings, etc). If you want
	//      to observe an array inside an object, you'll need to check one of its static values (such as its length,
	//      or the value of its first element).
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

	function setTranslationService(translation_service: string, filter_mode: string) {
		getTranslationService(translation_service, previous_service).then(service => {
			plugin.translator = service
			previous_service = translation_service;

			const languages = plugin.translator.available_languages || $settings.service_settings[translation_service].available_languages;
			if (filter_mode === "1")
				$data.available_languages = languages.filter(x => $data.spellchecker_languages.includes(x));
			else if (filter_mode === "2")
				$data.available_languages = languages.filter(x => $settings.service_settings[translation_service].selected_languages.includes(x));
			else
				$data.available_languages = languages;
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

		if (display_language_observer === 'local')
			language = ISO6391.getNativeName(language) || t(language);
		else if (display_language_observer === 'display')
			language = t(language);

		return language + extra;
	}

	async function getAPIKey(service: string, mode: string) {
		if (mode === 'password')
			return await aesGcmDecrypt($settings.service_settings[service].api_key, localStorage.getItem('password'));
		else if (mode === 'local_only')
			return localStorage.getItem(`${service}_api_key`);
		else if (mode === 'dont_save')
			return sessionStorage.getItem(`${service}_api_key`);
		else
			return $settings.service_settings[service].api_key;
	}

	export function getExistingService(service: string) {
		return active_services[service];
	}

	export async function getTranslationService(service: string, old_service: string): Promise<DummyTranslate> {
		if (!service || !(service in SERVICES_INFO))
			return null;

		let translator: DummyTranslate;

		if (service in active_services) {
			translator = active_services[service];
			service_uses[service] += 1;
		} else {
			const service_settings = $settings.service_settings[service];

			if ($settings.security_setting !== 'none' && SERVICES_INFO[service].requires_api_key)
				service_settings.api_key = await getAPIKey(service, $settings.security_setting);

			let translation_service: DummyTranslate = null;
			if (service === "google_translate")
				translation_service = new GoogleTranslate(service_settings);
			else if (service === "bing_translator")
				translation_service = new BingTranslator(service_settings);
			else if (service === "yandex_translate")
				translation_service = new YandexTranslate(service_settings);
			else if (service === "deepl")
				translation_service = new Deepl(service_settings);
			else if (service === "libre_translate")
				translation_service = new LibreTranslate(service_settings);
			else if (service === "bergamot")
				translation_service = new BergamotTranslate('fasttext' in active_services ? active_services['fasttext'] : await getTranslationService('fasttext', ''),
					plugin, $data.models?.bergamot, $settings.storage_path);
			else if (service === "fanyi_youdao")
				translation_service = new FanyiYoudao(service_settings);
			else if (service === "fanyi_qq")
				translation_service = new FanyiQq(service_settings);
			else if (service === "amazon_translate")
				translation_service = new AmazonTranslate(service_settings);
			else if (service === "lingva_translate")
				translation_service = new LingvaTranslate(service_settings);
			else if (service === 'fasttext') {
				translation_service = new FastTextDetector(plugin, $data.models?.fasttext);
			}

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

			if ($settings.service_settings[service].available_languages)
				$settings.service_settings[service].available_languages
					.filter(locale => !$data.all_languages.has(locale))
					.forEach(locale => { $data.all_languages.set(locale, formatLocale(locale)) });

			active_services[service] = translation_service;
			translator = translation_service;
			service_uses[service] = 1;
		}

		if (old_service)
			service_uses[old_service] -= 1;
		if (old_service && old_service !== service && !service_uses[old_service])
			delete active_services[old_service];
		return translator;
	}
	
	

	// function validateAPIKey() {
	// 	if (SERVICES_INFO[service_observer].requires_api_key) {
	// 		let invalidated = false;
	// 		let message = '';
	// 		// API key is required but not provided, invalid state
	// 		if (!api_key_observer) {
	// 			invalidated = null;
	// 			message = "No API key was given";
	//
	// 			// Security setting is password but given API key is still encrypted (ends on '=='), invalid state
	// 		} else if ($settings.security_setting === 'password') {
	// 			// FIXME: Not every encrypted key ends with '==' for some reason
	// 			if (api_key_observer.endsWith("==")) {
	// 				invalidated = true;
	// 				message = "Password is still encrypted";
	// 			}
	// 		}
	// 		if (invalidated) {
	// 			$settings.service_settings[service_observer].validated = false;
	// 			plugin.translator.valid = false;
	// 		} else if (invalidated === null) {
	// 			$settings.service_settings[service_observer].validated = null;
	// 			plugin.translator.valid = null;
	// 		}
	// 		if (message && !plugin.settings_open)
	// 			plugin.message_queue(message, 5000, true);
	// 	}
	// }


	$: {
		// And this is why I shouldn't have chosen for reactivity, the optimal solution would be to
		// manually set the models localstorage after every write, but I am a lazy coder
		if (Object.keys(model_observer).length) {
			localStorage.setItem('models', JSON.stringify(model_observer));
		}
	}

	function updateSpellcheckerLanguages() {
		$data.spellchecker_languages = [...new Set(app.vault.config.spellcheckLanguages.map((x) => {
			return x.split('-')[0];
		}))];
	}

	onMount(() => {
		// @ts-ignore (Config exists in vault)
		if (app.vault.config.spellcheckLanguages)
			$data.spellchecker_languages = [...new Set(app.vault.config.spellcheckLanguages.map(x => x.split('-')[0]))]

		// This is not an ideal solution, as config-changed gets called quite a bit
		//@ts-ignore (config-changed event exists)
		plugin.registerEvent(app.vault.on('config-changed', (e: any) => {
			// @ts-ignore (Config exists in vault)
			if (app.vault.config.spellcheckLanguages) {
				updateSpellcheckerLanguages();
				if ($settings.filter_mode === "1")
					setTranslationService(service_observer, filter_mode_observer);
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

		// Remove all services that do not work on mobile (both in the settings, as their features)
		if (Platform.isMobile) {
			// FIXME: Also check all translation views for usage of bergamot

			if (SERVICES_INFO[$settings.translation_service].desktop_only) {
				plugin.message_queue(`${toTitleCase($settings.translation_service)} is currently not supported on mobile devices, defaulting to Google Translate`, 5000, true);
				$settings.translation_service = 'google_translate';
			}
			setAvailableServices(Object.fromEntries(Object.entries(SERVICES_INFO).filter(([key, value]) => !value.desktop_only)));
		}
	});
</script>
