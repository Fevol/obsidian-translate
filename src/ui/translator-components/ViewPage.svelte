<script lang="ts">
	import {Scope} from "obsidian";
	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";
	import {horizontalSlide} from "../animations";
	import {Dropdown, TextArea} from "../components";
	import {NavHeader, View} from "../obsidian-components";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
	import {DETECTOR_SERVICES_INFO, FILTER_MODES, ICONS, TRANSLATION_SERVICES_INFO, VIEW_MODES} from "../../constants";
	import {Icon} from "../components";
	import {SwitchService} from "../modals";
	import t from "../../l10n";
	import {onDestroy} from "svelte";

	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;
	let selectable_languages = [];
	let current_layout = "vertical";
	let view_mode_observer = $settings.view_mode;
	let auto_translate_observer: any;
	let language_to_observer: any;
	let language_from_observer: any;


	// Implements Cmd+Enter functionality for quick translation
	const view_scope = new Scope(app.scope);
	view_scope.register(['Mod'], 'Enter', (e) => {
		translate();
		return false;
	});

	async function translate() {
		// While validation is also checked within the translator, if we don't check if the settings are open,
		// 	we don't want the message to be displayed
		if (!$settings.service_settings[$settings.translation_service].validated) {
			if (!plugin.settings_open)
				plugin.message_queue("Translation service is not validated");
			return;
		}

		// If no language from was specified or the saved language_from is not in the list of available languages
		// for the translation service, auto-detect language
		if ($settings.language_from !== 'auto' && !$data.filtered_languages.contains($settings.language_from)) {
			$settings.language_from = 'auto';
		}

		if (!$data.filtered_languages.contains($settings.language_to)) {
			plugin.message_queue("No language to translate to was selected");
			return;
		}

		// Check if there is actually something to be translated, or if the text is just whitespace
		if ($settings.language_from === $settings.language_to || !/[a-zA-Z]/g.test($data.text_from)) {
			$data.text_to = $data.text_from;
			return;
		}

		let return_values = await plugin.translator.translate($data.text_from, $settings.language_from, $settings.language_to);

		if (return_values.message) {
			plugin.message_queue(return_values.message);
			if (plugin.translator.failure_count >= 10)
				$settings.service_settings[$settings.translation_service].validated = false;
		}

		if (return_values.translation) {
			$data.detected_language = return_values.detected_language;
			$data.text_to = return_values.translation;
		}
	}

	$: auto_translate_observer = $settings.service_settings[$settings.translation_service].auto_translate;
	$: view_mode_observer = $settings.view_mode;
	$: language_from_observer = $settings.language_from;
	$: language_to_observer = $settings.language_to;

	// Trigger: if either language was changed, update text_to if auto-translate is enabled
	// FIXME: Reactivity: this gets called on: filter change & layout change, unintended behaviour on auto_translate
	$: language_from_observer, language_to_observer, auto_translate_observer, auto_translate_observer ? translate() : null;




	// If available_languages changes (list of locales that the user has applied filter on), rebuild the selectable_languages
	// array, representing all languages that the user can select in the Translation view
	$: $data.filtered_languages, selectable_languages = Array.from($data.filtered_languages)
		.map((locale) => {const language = $data.all_languages.get(locale);return {'value': locale, 'text': language ? language : locale};})
		.sort((a, b) => a.text.localeCompare(b.text))

	$: {
		view_mode_observer;
		// Since Reactivity is far more clean to write in Svelte files (and perhaps more efficient),
		// we listen to view mode being changed here, and then fetch the View element by its ID
		const rectangle = document.getElementById("translator-view")?.getBoundingClientRect();
		onResize(rectangle?.width || 0, rectangle?.height || 0);
	}


	export async function onResize(width, height) {
		if ($settings.view_mode) {
			current_layout = VIEW_MODES[$settings.view_mode].id;
		} else {
			let element = document.getElementById("translator-view");

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
				   onClick: () => new SwitchService(plugin.app, plugin).open(),
			   },
			   {
				   icon: $settings.service_settings[$settings.translation_service].auto_translate ? "zap" : "hand",
				   tooltip: ($settings.service_settings[$settings.translation_service].auto_translate ? "Automatically translating" : "Translating manually"),
				   onClick: () => {
					   $settings.service_settings[$settings.translation_service].auto_translate =
					   !$settings.service_settings[$settings.translation_service].auto_translate;
				   }
			   },
			   {
				   icon: FILTER_MODES[$settings.service_settings[$settings.translation_service].filter_type].icon,
				   tooltip: FILTER_MODES[$settings.service_settings[$settings.translation_service].filter_type].tooltip,
				   onClick: () => {
					   $settings.service_settings[$settings.translation_service].filter_type =
					   ($settings.service_settings[$settings.translation_service].filter_type + 1) % 3;
				   }
			   },
			   {
				   icon: VIEW_MODES[$settings.view_mode].icon,
				   tooltip: VIEW_MODES[$settings.view_mode].tooltip,
				   onClick: () => {
					   $settings.view_mode = ($settings.view_mode + 1) % 4;
				   }
			   },
			   {
				   icon: "settings",
				   tooltip: "Open Settings",
				   onClick: () => {
					   plugin.app.setting.open();
					   plugin.app.setting.openTabById("obsidian-translate");
				   }
			   }

			   ]}
	/>

	<div slot="view" class="translator-view {current_layout}"
		on:mouseenter={() => app.keymap.pushScope(view_scope)}
		on:mouseleave={() => app.keymap.popScope(view_scope)}
	>
		<!-- TODO: Make the field resizable (save data)-->
		<!-- TODO: Event should only be triggered when the user is done typing (?) (count delay)-->
		<!-- FIXME: Some services use regional identifiers for their locales, might cause trouble -->
		<div class="translator-column translator-left-column" >
			<Dropdown
				class="translator-select"
				value={$settings.language_from}
				options={
					$data.has_autodetect_capability ? [
						$data.detected_language ? {value: 'auto', text: `Detect Language (${t($data.detected_language)})`} : {value: 'auto', text: 'Detect Language'},
						...selectable_languages,
					] : selectable_languages
				}
				onChange={(e) => {
					$settings.language_from = e.target.value;
					$data.detected_language = undefined;
				}}
			/>
			<TextArea
				placeholder="Type here..."
				class="translator-textarea"
				text={$data.text_from}
				typingdelay={$settings.service_settings[$settings.translation_service].auto_translate &&
				 			 $settings.service_settings[$settings.translation_service].auto_translate_interval}
				onChange={async (e) => {
					$data.text_from = e.target.value;
					if (!$data.text_from) {
						$data.text_to = "";
						$data.detected_language = undefined;
					} else if ($settings.service_settings[$settings.translation_service].auto_translate) {
						await translate();
					}
				}}
			/>
		</div>


		<div class="translator-button-container translator-center-column">
			<button class="translator-button" aria-label="Switch languages around"
					on:click={async () => {
						if ($settings.language_from === 'auto') {
							if ($data.detected_language) {
								[$settings.language_from, $settings.language_to] = [$settings.language_to, $data.detected_language];
								$data.detected_language = undefined;
							} else
								$settings.language_from = $data.filtered_languages[0];
						} else {
							[$settings.language_from, $settings.language_to] = [$settings.language_to, $settings.language_from];
						}
						[$data.text_from, $data.text_to] = [$data.text_to, $data.text_from];
					}}
			>
					<Icon icon=switch size={20}/>
			</button>

			{#if !$settings.service_settings[$settings.translation_service].auto_translate}
				<button transition:horizontalSlide={{ duration: 300 }} class="translator-button"
						on:click={async () => {await translate();}} aria-label="Translate">
					<Icon icon=translate size={20}/>
				</button>
			{/if}

		</div>


		<div class="translator-column translator-right-column">
			<Dropdown
				class="translator-select"
				value={$settings.language_to}
				options={selectable_languages}
				onChange={(e) => {
			$settings.language_to = e.target.value;
		}}
			/>
			<TextArea
				placeholder="Translation"
				class="translator-textarea"
				text={$data.text_to}
				readonly={true}
			/>
		</div>
		<div class="translator-attribution-column">
			<div class="translator-attribution-column-text">
				Using
				<a href={services[$settings.translation_service].url} class="icon-text translator-service-text">
					<Icon icon={$settings.translation_service}/>
					{`${$settings.translation_service.replace('_', ' ')}`}
				</a>
				{#if plugin.detector}
					with
					<a href={DETECTOR_SERVICES_INFO["fasttext"].url} class="icon-text translator-service-text">
						<Icon icon="fasttext"}/>
						FastText
					</a>
				{/if}
			</div>


			{#if services[$settings.translation_service].attribution !== undefined}
				<Icon content={ICONS[$settings.translation_service + '_attribution']} size={40} svg_size={[160, 40]}/>
			{/if}

		</div>
	</div>
</View>

<style class="scss">
	/* TODO: Improve flex to allow multiple grid layouts based on the side panel width and height
	  (e.g.: <200px = (FIELD) (BUTTON) (FIELD), 200px > ... > 400px = (FIELD, FIELD) (BUTTON), >400px (FIELD, BUTTON, FIELD) */
	.translator-view {
		display: grid;
		margin: 12px;
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

	.translator-button {
		border-radius: 100%;
		width: 50px;
		height: 50px;
		filter: brightness(1.2);
		display: grid !important;
		justify-content: center;
		align-content: center;
		margin-right: 0;
	}

	.translator-service-text {
		text-transform: capitalize;
		font-style: italic;
		/*filter: brightness(0.5);*/
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
