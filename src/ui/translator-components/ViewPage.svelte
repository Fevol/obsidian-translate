<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {onDestroy} from "svelte";
	import type {Writable} from "svelte/store";
	import {settings, data} from "../../stores";
	import {horizontalSlide} from "../animations";

	import {Dropdown, TextArea, Icon} from "../components";
	import {NavHeader, View} from "../obsidian-components";
	import {SwitchService} from "../modals";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
	import { DEFAULT_SETTINGS, FILTER_MODES, ICONS, SERVICES_INFO, VIEW_MODES } from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {Scope, Platform} from "obsidian";
	import t from "../../l10n";

	export let plugin: TranslatorPlugin;

	export let id: string;

	export let language_from: string;
	export let language_to: string;
	export let translation_service: Writable<string>;
	export let auto_translate: boolean;
	export let view_mode: number;
	export let filter_mode: number;

	const services = SERVICES_INFO;
	let current_layout = "vertical";

	let previous_service: string = '';
	let translator: DummyTranslate;
	let autodetect_capability: boolean = false;

	let text_from: string = '';
	let text_to: string = '';
	let detected_language: string;

	let available_languages: string[] = [];
	let selectable_languages: {text: string, value: string}[];

	// Implements Cmd+Enter functionality for quick translation
	const view_scope = new Scope(app.scope);
	view_scope.register(['Mod'], 'Enter', (e) => {
		translate();
		return false;
	});

	$: spellchecker_languages_observer = $data.spellchecker_languages.length;
	$: selected_languages_observer = $settings.service_settings[$translation_service].selected_languages.length;
	$: display_language_observer = $settings.display_language;
	$: spellchecker_languages_observer, selected_languages_observer, available_languages, filter_mode, display_language_observer, filterLanguages();

	$: bergamot_models_observer = $data.models?.bergamot?.models?.length;
	$: bergamot_models_observer, updateAvailableLanguages();
	$: fasttext_models_observer = $data.models?.fasttext;
	$: autodetect_capability = fasttext_models_observer;

	$: language_from, language_to, $translation_service, auto_translate, view_mode, filter_mode, app.workspace.requestSaveLayout();

	function updateAvailableLanguages() {
		if ($translation_service === 'bergamot') {
			available_languages = translator.available_languages;
			filterLanguages();
		}
	}

	$: {
		auto_translate = auto_translate && $settings.service_settings[$translation_service].auto_translate;
		if (auto_translate)
			translate();
	};

	$: {
		view_mode;
		// Since Reactivity is far more clean to write in Svelte files (and perhaps more efficient),
		// we listen to view mode being changed here, and then fetch the View element by its ID
		const rectangle = document.getElementById(id)?.getBoundingClientRect();
		onResize(rectangle?.width || 0, rectangle?.height || 0);
	}

	function updateService() {
		if (Platform.isMobile && $translation_service === 'bergamot')
			$translation_service = $settings.translation_service;

		plugin.reactivity.getTranslationService($translation_service, previous_service).then(service => {
			autodetect_capability = service.has_autodetect_capability();
			translator = service;
			previous_service = $translation_service;
			available_languages = translator.available_languages || $settings.service_settings[$translation_service].available_languages;

		});
	}

	$: $translation_service, updateService();

	function filterLanguages() {
		let languages = available_languages;
		if (filter_mode === 1)
			languages = languages.filter(x => $data.spellchecker_languages.includes(x));
		else if (filter_mode === 2)
			languages = languages.filter(x => $settings.service_settings[$translation_service].selected_languages.includes(x));
		selectable_languages = Array.from(languages)
			.map((locale) => {return {'value': locale, 'text': $data.all_languages.get(locale) || locale};})
			.sort((a, b) => a.text.localeCompare(b.text))
	}


	async function translate() {
		// If no language from was specified or the saved language_from is not in the list of available languages
		// for the translation service, auto-detect language
		if (!selectable_languages.some(x => x.value === language_from))
			language_from = 'auto';

		let return_values = await translator.translate(
			text_from,
			language_from,
			selectable_languages.some(x => x.value === language_to) ? language_to : '',
		);

		// We'd rather not have messages displayed while in the settings
		if (return_values.message && !plugin.settings_open)
			plugin.message_queue(return_values.message);

		if (return_values.translation) {
			detected_language = return_values.detected_language;
			text_to = return_values.translation;
		}
	}


	export async function onResize(width, height) {
		if (view_mode) {
			current_layout = VIEW_MODES[view_mode].id;
		} else {
			let element = document.getElementById(id);

			// On mount the width and height of element is not known, so do not attempt to guess configuration at this point
			if (!width || !height)
				return;

			const width_ratio = width / height;
			let new_layout = "vertical";
			if (width_ratio > 1.4)
				new_layout = "horizontal";
			else if (width_ratio > 1.2)
				new_layout = "mixed";
			else if (width_ratio < 1.19)
				new_layout = "vertical";
			current_layout = new_layout;
		}
	}

	onDestroy(() => {
		app.keymap.popScope(view_scope);
	})


</script>

<View>
	<NavHeader slot="header"
	   buttons={[
	   {
		   icon: "cloud",
		   tooltip: "Change Translation Service",
		   onClick: () => new SwitchService(plugin.app, plugin, (service) => {
				if (!$settings.service_settings[service])
					$settings.service_settings[service] = DEFAULT_SETTINGS.service_settings[service];
				previous_service = $translation_service;
				$translation_service = service;
		   }).open(),
	   },
	   {
		   icon: auto_translate ? "zap" : "hand",
		   tooltip: auto_translate ? "Automatically translating" : "Translating manually",
		   onClick: () => { auto_translate = !auto_translate },
		   disabled: !$settings.service_settings[$translation_service].auto_translate
	   },
	   {
		   icon: FILTER_MODES[filter_mode].icon,
		   tooltip: FILTER_MODES[filter_mode].tooltip,
		   onClick: () => filter_mode = (filter_mode + 1) % 3
	   },
	   {
		   icon: VIEW_MODES[view_mode].icon,
		   tooltip: VIEW_MODES[view_mode].tooltip,
		   onClick: () => view_mode = (view_mode + 1) % 4
	   },
	   {
		   icon: "settings",
		   tooltip: "Open Settings",
		   onClick: () => {
				$data.tab = $translation_service;
				plugin.app.setting.open();
				plugin.app.setting.openTabById("obsidian-translate");
		   }
	   }
	   ].filter(x => !x.disabled)}
	/>

	<div slot="view" class="translator-view {current_layout}" class:disable-animations={!$settings.enable_animations}
		on:mouseenter={() => app.keymap.pushScope(view_scope)}
		on:mouseleave={() => app.keymap.popScope(view_scope)}
	>
		<!-- TODO: Make the field resizable (save data)-->
		<div class="translator-column translator-left-column" >
			<Dropdown
				class="translator-select"
				value={language_from}
				options={
					autodetect_capability ?
						[detected_language ? {value: 'auto', text: `Detect Language (${t(detected_language)})`} : {value: 'auto', text: 'Detect Language'}, ...selectable_languages] :
						selectable_languages
				}
				onChange={(e) => {
					language_from = e.target.value;
					detected_language = undefined;
				}}
			/>
			<TextArea
				placeholder="Type here..."
				class="translator-textarea"
				text={text_from}
				typingdelay={auto_translate && $settings.service_settings[$translation_service]?.auto_translate_interval}
				onChange={async (e) => {
					text_from = e.target.value;
					if (!text_from) {
						text_to = "";
						detected_language = undefined;
					} else if (auto_translate) {
						await translate();
					}
				}}
			/>
		</div>


		<div class="translator-button-container translator-center-column">
			<button class="translator-button" aria-label="Switch languages around"
					on:click={async () => {
						if ($settings.switch_button_action === 'switch-both' || $settings.switch_button_action === 'switch-language') {
							if (language_from === 'auto') {
								if (detected_language) {
									[language_from, language_to] = [language_to, detected_language];
									detected_language = undefined;
								} else
								[language_from, language_to] = [language_to, null];
							} else {
								[language_from, language_to] = [language_to, language_from];
							}
						}
						if ($settings.switch_button_action === 'switch-both' || $settings.switch_button_action === 'switch-text') {
							[text_from, text_to] = [text_to, text_from];
						}
					}}
			>
					<Icon icon=switch size={20}/>
			</button>

			{#if !auto_translate}
				<button transition:horizontalSlide={{ duration: 300 }} class="translator-button"
						on:click={async () => {await translate();}} aria-label="Translate">
					<Icon icon=translate size={20}/>
				</button>
			{/if}

		</div>


		<div class="translator-column translator-right-column">
			<Dropdown
				class="translator-select"
				value={language_to}
				options={selectable_languages}
				onChange={(e) => {
			language_to = e.target.value;
		}}
			/>
			<TextArea
				placeholder="Translation"
				class="translator-textarea"
				text={text_to}
				readonly={true}
			/>
		</div>

		{#if !$settings.hide_attribution}
			<div class="translator-attribution-column">
				<div class="translator-attribution-column-text">
					Using
					<a href={services[$translation_service].url} target="_blank" class="icon-text translator-service-text">
						<Icon icon={$translation_service}/>
						{`${$translation_service.replace('_', ' ')}`}
					</a>
					{#if plugin.detector}
						with
						<a href={services["fasttext"].url} target="_blank" class="icon-text translator-service-text">
							<Icon icon="fasttext"/>
							FastText
						</a>
					{/if}
				</div>


				{#if services[$translation_service].attribution !== undefined}
					<Icon content={ICONS[$translation_service + '_attribution']} size={40} svg_size={[160, 40]}/>
				{/if}

			</div>
		{/if}
	</div>
</View>

<style class="scss">
	.translator-view {
		display: grid;
		/*margin: var(--size-4-2);*/
		flex-grow: 1;
		gap: 16px;
	}

	.translator-column {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.translator-column > * {
		width: 0;
	}


	.translator-select {
		width: auto;
	}

	.translator-left-column {
		grid-area: left;
	}

	.translator-center-column {
		grid-area: center;
	}

	.translator-right-column {
		grid-area: right;
	}

	.translator-attribution-column {
		grid-area: bottom;
		justify-content: space-between;
		display: flex;
		overflow: hidden;

		flex-flow: row wrap;
		height: calc(var(--font-text-size)*1.5);
	}

	.translator-attribution-column-text {
		display: flex;
		flex-direction: row;
		gap: 4px;
		align-items:start;

		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.translator-column {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 8px;
		/* Prevents grid taking up more space than necessary */
		min-width: 0;
	}

	.translator-button-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.translator-service-text {
		text-transform: capitalize;
		font-style: italic;
	}

	.vertical {
		grid-template-rows: 1fr auto 1fr auto;
		grid-template-areas: "left" "center" "right" "bottom";
	}

	.mixed {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr auto auto;
		grid-template-areas: "left right" "center center" "bottom bottom";
	}

	.horizontal {
		grid-template-columns: 1fr auto 1fr;
		grid-template-rows: 1fr auto;
		grid-template-areas: "left center right" "bottom bottom bottom";
	}
</style>
