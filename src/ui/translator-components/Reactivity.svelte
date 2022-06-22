<!-- This component handles all updates in the settings/data objects -->

<script lang="ts">

	import {onMount} from "svelte";
	import {App, moment} from "obsidian";

	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
	import ISO6391 from "iso-639-1";

	import t from "../../l10n";

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
	$: api_key_observer = $settings.service_settings[$settings.translation_service].api_key;
	$: host_observer = $settings.service_settings[$settings.translation_service].host;
	$: region_observer = $settings.service_settings[$settings.translation_service].region;
	$: service_observer = $settings.translation_service;



	function updateAvailableLanguages() {
		$data.available_languages =
			filter_type_observer === 0 ? $settings.service_settings[$settings.translation_service].available_languages :
			filter_type_observer === 1 ? $data.spellchecker_languages :
										 $settings.service_settings[$settings.translation_service].selected_languages;
	}

	function updateLanguageNames() {
		$data.all_languages =
			new Map(Array.from($settings.service_settings[$settings.translation_service].available_languages.map((locale: string) => {
				let language: any = locale,
					extra: string = '';
				if (language.contains('-')) {
					[language, extra] = language.split('-');
					extra = t(extra.toUpperCase());
					extra = extra ? ` (${extra})` : '';
				}
				if ($settings.display_language === 'local')
					language = ISO6391.getNativeName(language)
				else if ($settings.display_language === 'display')
					language = t(language)
				return [locale, language + extra];
		})))
	}
	$: filter_type_observer, selected_languages_observer, updateAvailableLanguages();
	$: plugin.setupTranslationService(service_observer, api_key_observer, region_observer, host_observer);


	// TWO TRIGGERS:
	//  1. Translation service got changed (different available languages length)
	// 	2. Available languages of translator got updated in settings (different available languages length)
	$: available_languages_observer, updateAvailableLanguages(), updateLanguageNames();




	onMount(() => {
		// Set-up plugin data

		// There is currently no way to catch when the display language of Obsidian is being changed, as it is not reactive
		// (add current display language to app.json?)
		// So 'display languages' setting will only be applied correctly when the program is fully restarted or when
		// the language display name setting is changed.
		$data.current_language = plugin.fixLanguageCode(moment.locale());

		// @ts-ignore (Config exists in vault)
		if (app.vault.config.spellcheckLanguages) {
			$data.spellchecker_languages = [...new Set(app.vault.config.spellcheckLanguages.map((x) => {
				return x.split('-')[0];
			}))]
		}
	});

	// FIXME: Find a way to set language_to and language_from in a reactive way without causing a loop
	// function get_language(language: string, other_language: string) {
	// 	if ($data.available_languages.contains(language))
	// 		return language;
	// 	if (!$data.available_languages)
	// 		return '';
	// 	if ($data.available_languages.length === 1)
	// 		return $data.available_languages.first();
	// 	// TODO: Make this random?
	// 	return $data.available_languages[0] === other_language ? $data.available_languages[1] : $data.available_languages[0];
	// }

</script>
