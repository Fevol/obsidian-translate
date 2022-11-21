<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {onDestroy, onMount} from "svelte";
	import type {Writable} from "svelte/store";
	import {settings, data, hide_shortcut_tooltips, glossary} from "../../stores";
	import {horizontalSlide} from "../animations";

	import {Dropdown, TextArea, Icon} from "../components";
	import {NavHeader, View} from "../obsidian-components";
	import {SwitchService} from "../modals";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
	import {
		DEFAULT_SETTINGS,
		FILTER_MODES,
		ICONS,
		QUICK_ACTIONS,
		QUICK_SETTINGS,
		SERVICES_INFO,
		VIEW_MODES
	} from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {Scope, Platform} from "obsidian";
	import t from "../../l10n";
	import Button from "../components/Button.svelte";
	import {getHotKeyString} from "../../util";

	export let plugin: TranslatorPlugin;

	export let id: string;

	export let language_from: string;
	export let language_to: string;
	export let translation_service: Writable<string>;
	export let auto_translate: boolean;
	export let apply_glossary: boolean;
	export let view_mode: number;
	export let filter_mode: number;
	export let show_attribution: boolean;
	export let top_buttons: string[];
	export let left_buttons: string[];
	export let right_buttons: string[];

	let parent_view;
	$: {
		// Reworked so keyscope will now get called *anywhere* in the itemview
		if (parent_view) {
			parent_view?.$$.root.parentNode.addEventListener("mouseenter", () => {
				app.keymap.pushScope(view_scope);
			})
			parent_view?.$$.root.parentNode.addEventListener("mouseleave", () => {
				app.keymap.popScope(view_scope);
			})
		}
	}

	$: top_button_disabled = {
		'automatic-translation': !$settings.service_settings[$translation_service].auto_translate,
		'apply-glossary': !$settings.local_glossary,
	}

	let top_button_states = {
		'change-service': 0,
		'automatic-translation': auto_translate | 0,
		'apply-glossary': apply_glossary | 0,
		'change-layout': view_mode,
		'apply-filter': filter_mode,
		'open-settings': 0,
	}

	const top_button_actions = {
		'change-service': () => {
			new SwitchService(plugin.app, plugin, (service) => {
				previous_service = $translation_service;
				$translation_service = service;
			}).open();
		},
		'automatic-translation': () => {
			auto_translate = !auto_translate;
			top_button_states['automatic-translation'] = auto_translate ? 1 : 0;
		},
		'apply-glossary': () => {
			apply_glossary = !apply_glossary;
			top_button_states['apply-glossary'] = apply_glossary ? 1 : 0;
		},
		'change-layout': () => {
			view_mode = (view_mode + 1) % 4;
			top_button_states['change-layout'] = view_mode;
		},
		'apply-filter': () => {
			filter_mode = (filter_mode + 1) % 3;
			top_button_states['apply-filter'] = filter_mode;
		},
		'open-settings': () => {
			$data.tab = $translation_service;
			plugin.app.setting.open();
			plugin.app.setting.openTabById("obsidian-translate");
		},
	}

	const left_button_actions = {
		'copy': () => {
			navigator.clipboard.writeText(text_from);
		},
		'paste': () => {
			navigator.clipboard.readText().then((clipboard_contents) => {
				text_from = clipboard_contents;
			});
		},
		'clear': () => {
			text_from = '';
		},
	}

	const right_button_actions = {
		'copy': () => {
			navigator.clipboard.writeText(text_to);
		},
		'paste': () => {
			navigator.clipboard.readText().then((clipboard_contents) => {
				text_to = clipboard_contents;
			});
		},
		'clear': () => {
			text_to = '';
		},
	}

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
	const left_view_scope = new Scope(view_scope);
	const right_view_scope = new Scope(view_scope);

	$: $settings.hotkeys, reloadHotkeys();

	// FIXME: Find a way to only rigger reactivity on hotkeys change
	function reloadHotkeys() {
		// Unload all hotkeys currently registered on the page
		view_scope.keys = [];
		for (const hotkey of $settings.hotkeys) {
			if (hotkey.key) {
				if (hotkey.id === 'view-translate') {
					view_scope.register(hotkey.modifiers, hotkey.key, () => {
						translate();
						return false;
					});
				} else if (hotkey.id === 'view-language-switch') {
					view_scope.register(hotkey.modifiers, hotkey.key, () => {
						switchLanguages();
						return false;
					});
				} else {
					const action = hotkey.id.split('-').at(-1);
					if (left_buttons.find((button) => button.id === action)) {
						left_view_scope.register(hotkey.modifiers, hotkey.key, () => {
							left_button_actions[action]();
							return false;
						});
					}
					if (right_buttons.find((button) => button.id === action)) {
						right_view_scope.register(hotkey.modifiers, hotkey.key, () => {
							right_button_actions[action]();
							return false;
						});
					}
				}
			}
		}
	}

	$: $translation_service, updateService();
	$: spellchecker_languages_observer = $data.spellchecker_languages.length;
	$: selected_languages_observer = $settings.service_settings[$translation_service].selected_languages.length;
	$: display_language_observer = $settings.display_language;
	$: spellchecker_languages_observer, selected_languages_observer, available_languages, filter_mode, display_language_observer, filterLanguages();
	$: available_services_observer = $data.available_services.length;

	$: bergamot_models_observer = $data.models?.bergamot?.models?.length;
	$: bergamot_models_observer, updateAvailableLanguages();
	$: fasttext_models_observer = $data.models?.fasttext;
	$: autodetect_capability = fasttext_models_observer;

	$: language_from, language_to, $translation_service, auto_translate, apply_glossary, view_mode, filter_mode,
		show_attribution, top_buttons, left_buttons, right_buttons, app.workspace.requestSaveLayout();

	function updateAvailableLanguages() {
		if (translator && $translation_service === 'bergamot') {
			available_languages = translator.available_languages;
			filterLanguages();
		}
	}

	$: {
		apply_glossary;
		language_from;
		language_to;
		if (auto_translate)
			autoTranslate();
	};

	function autoTranslate() {
		// This function exists for two reasons:
		// 1. Avoids the translate() function being called when component has not been fully mounted yet
		// 2. Prevent translate() function getting called without text_from to translate with (and resulting in 'No text provided' messages)
		// (putting this logic in translate() function would result in text_from being considered part of the reactive statement)
		if (text_from)
			translate();
	}

	$: {
		view_mode;
		// Since Reactivity is far more clean to write in Svelte files (and perhaps more efficient),
		// we listen to view mode being changed here, and then fetch the View element by its ID
		const rectangle = document.getElementById(id)?.getBoundingClientRect();
		onResize(rectangle?.width || 0, rectangle?.height || 0);
	}

	function updateService() {
		plugin.reactivity.getTranslationService($translation_service, previous_service).then(service => {
			autodetect_capability = service.has_autodetect_capability();
			translator = service;
			previous_service = $translation_service;
			available_languages = translator.available_languages || $settings.service_settings[$translation_service].available_languages;
		});
	}

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

		let input_text = text_from;
		if ($settings.local_glossary && apply_glossary && plugin.detector) {
			if (language_from === 'auto') {
				const detection_results = await plugin.detector.detect(input_text);
				if (detection_results.detected_languages)
					language_from = detection_results.detected_languages[0].language;
			}
			const temp_language_from = detected_language || language_from;
			const glossary_pair = glossary.dicts[temp_language_from + language_to];
			if (temp_language_from && glossary_pair) {
				input_text = input_text.replace(glossary.replacements[temp_language_from + language_to],
					(match) => {
						// TODO: Check if case insensitivity per word is also feasible,
						//  issue would be that the search would always have to be executed with case-insensitive matching
						//  and then case-sensitivity check should happen here (by removing toLowerCase())
						//  either way: heavy performance impact
						return glossary_pair.find(x => x[0].toLowerCase() === match.toLowerCase())[1] || match;
					});
			}
		}

		let return_values = await translator.translate(
			input_text,
			detected_language || language_from,
			selectable_languages.some(x => x.value === language_to) ? language_to : '',
		);

		if (detected_language)
			return_values.detected_language = detected_language;

		// We'd rather not have messages displayed while in the settings
		if (return_values.message && !plugin.settings_open)
			plugin.message_queue(return_values.message);

		if (return_values.translation) {
			detected_language = return_values.detected_language;
			text_to = return_values.translation;
		}
	}

	async function switchLanguages() {
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
			else
				new_layout = "vertical";
			current_layout = new_layout;
		}
	}

	onMount(() => {
		if (!$data.available_services.includes($translation_service))
			$translation_service = $settings.translation_service;
	})

	onDestroy(() => {
		app.keymap.popScope(view_scope);
	})


</script>

<View bind:this={parent_view}>
	<div slot="header">
		{#if top_buttons.length}
			<div class="nav-header">
				<div class="nav-buttons-container">
					{#each top_buttons as button}
						{#if !top_button_disabled[button]}
							<div aria-label={QUICK_SETTINGS[button].tooltip[top_button_states[button]]} on:click={top_button_actions[button]} class="nav-action-button">
								<Icon icon={QUICK_SETTINGS[button].icon[top_button_states[button]]}/>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div slot="view" class="translator-view {current_layout}" class:disable-animations={!$settings.enable_animations}>
		<!-- TODO: Make the field resizable (save data)-->
		<div class="translator-column translator-left-column"
			 on:mouseenter={() => app.keymap.pushScope(left_view_scope)}
			 on:mouseleave={() => app.keymap.popScope(left_view_scope)}
		>
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
			<div class="translator-textarea-column">
				<TextArea
					placeholder="Type here..."
					class="translator-textarea"
					text={text_from}
					typingdelay={auto_translate && $settings.service_settings[$translation_service]?.auto_translate_interval}
					onChange={async (e) => {
						text_from = e.target.value;
						if (!text_from) {
							text_to = "";
							// FIXME: If the user only types one word, the language detected for that word will be used
							//  as long as text_from is not cleared (resetting detected_languages every translation is suboptimal)
							detected_language = undefined;
						} else if (auto_translate) {
							await translate();
						}
					}}
				/>
				{#if left_buttons?.length}
					<div class="translator-textarea-quickbuttons">
						{#each left_buttons as quick_button}
							<Button class="rounded-translator-button" icon={QUICK_ACTIONS[quick_button].icon[0]}
									tooltip={QUICK_ACTIONS[quick_button].tooltip[0] + ($hide_shortcut_tooltips || !$settings.hotkeys.find(x => x.id.endsWith(quick_button)).key
												? '' : `\n[${getHotKeyString($settings.hotkeys.find(x => x.id.endsWith(quick_button)))}]`)}
									size="16" onClick={() => left_button_actions[quick_button]()}/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="translator-button-container translator-center-column">
			<button class="translator-button"
					aria-label={`Switch languages around${$hide_shortcut_tooltips || !$settings.hotkeys.find(x => x.id === 'view-language-switch').key ?
									'' : `\n[${getHotKeyString($settings.hotkeys.find(x => x.id === 'view-language-switch'))}]`}`}
					on:click={async () => { await switchLanguages(); }}
			>
					<Icon icon=switch size={20}/>
			</button>

			{#if !auto_translate}
				<button transition:horizontalSlide={{ duration: 300 }} class="translator-button"
						on:click={async () => {await translate();}}
						aria-label={`Translate${$hide_shortcut_tooltips || !$settings.hotkeys.find(x => x.id === 'view-language-switch').key ?
									'' : `\n[${getHotKeyString($settings.hotkeys.find(x => x.id === 'view-translate'))}]`}`}>
					<Icon icon=translate size={20}/>
				</button>
			{/if}

		</div>


		<div class="translator-column translator-right-column"
			 on:mouseenter={() => app.keymap.pushScope(right_view_scope)}
			 on:mouseleave={() => app.keymap.popScope(right_view_scope)}
		>
			<Dropdown
				class="translator-select"
				value={language_to}
				options={selectable_languages}
				onChange={(e) => {
					language_to = e.target.value;
				}}
			/>
			<div class="translator-textarea-column">
				<TextArea
					placeholder="Translation"
					class="translator-textarea"
					text={text_to}
					readonly={true}
				/>
				{#if right_buttons?.length}
					<div class="translator-textarea-quickbuttons">
						{#each right_buttons as quick_button}
							<Button class="rounded-translator-button" icon={QUICK_ACTIONS[quick_button].icon[0]}
									tooltip={QUICK_ACTIONS[quick_button].tooltip[0] + (($hide_shortcut_tooltips || !$settings.hotkeys.find(x => x.id.endsWith(quick_button)).key) ?
												'' : `\n[${getHotKeyString($settings.hotkeys.find(x => x.id.endsWith(quick_button)))}]`)}
									size="16" onClick={() => right_button_actions[quick_button]()}/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if show_attribution}
			<div class="translator-attribution-column">
				<div class="translator-attribution-column-text">
					Using
					<a href={services[$translation_service].url} target="_blank" class="icon-text translator-service-text">
						<Icon icon={$translation_service}/>
						{SERVICES_INFO[$translation_service].display_name}
					</a>
					{#if plugin.detector && $translation_service === "bergamot"}
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
