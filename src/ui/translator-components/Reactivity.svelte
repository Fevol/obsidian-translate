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

	$: $settings.translation_service,
		service_observer = $settings.translation_service,
		api_key_observer = $settings.service_settings[$settings.translation_service].api_key,
		host_observer = $settings.service_settings[$settings.translation_service].host,
		region_observer = $settings.service_settings[$settings.translation_service].region;

	$: api_key_observer, host_observer, region_observer,
		plugin.setupTranslationService(service_observer, api_key_observer, region_observer, host_observer)

	$: $settings.service_settings[$settings.translation_service].available_languages,
			$data.all_languages =
				new Map(Array.from($settings.service_settings[$settings.translation_service].available_languages.map((locale: string) => {
					let language: any = locale,
						extra: string = '';
					if (language.contains('-')) {
						[language, extra] = language.split('-');
						extra = t(extra);
						extra = extra ? ` (${extra})` : '';
					}
					if ($settings.display_language === 'local')
						language = ISO6391.getNativeName(language)
					else if ($settings.display_language === 'display')
						language = t(language)
					return [locale, language + extra];
				})))

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

	$: {
		// Apparently you can't use if else statements and expect reactivity to just 'work'
		//TODO: Check if anything can solve this mess
		$data.available_languages =
			$settings.service_settings[$settings.translation_service].filter_type === 0 ? $settings.service_settings[$settings.translation_service].available_languages :
			$settings.service_settings[$settings.translation_service].filter_type === 1 ? $data.spellchecker_languages :
			$settings.service_settings[$settings.translation_service].selected_languages;
	}



</script>
