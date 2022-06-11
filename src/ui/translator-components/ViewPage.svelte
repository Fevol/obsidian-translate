<script lang="ts">
	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";
	import {Button, Dropdown, TextArea} from "../components";
	import {NavHeader, View} from "../obsidian-components";

	import type {PluginData, TranslatorPluginSettings, APIServiceProviders} from "../../types";
	import {TRANSLATION_SERVICES_INFO} from "../../constants";
	import {Icon} from "../components";
	import {SwitchService} from "../../modals";

	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;
	let selectable_languages = [];

	async function translate() {
		if (!$settings.service_settings[$settings.translation_service].validated) {
			plugin.message_queue("Translation service is not validated");
			return;
		}

		if ($settings.language_from === $settings.language_to || !/[a-zA-Z]/g.test($data.text_from)) {
			$data.text_to = $data.text_from;
			return;
		}
		try {
			let return_values = await plugin.translator.translate($data.text_from, $settings.language_from, $settings.language_to);
			plugin.translator.failure_count = 0;
			if (return_values.detected_language !== undefined)
				$data.detected_language = return_values.detected_language;
			$data.text_to = return_values.translation;
		} catch {
			plugin.translator.failure_count += 1;
			// FIXME: Find a good treshold for the number of failures
			if (plugin.translator.failure_count >= 10) {
				plugin.message_queue("Translation service is blocked, please validate the service again to unblock it", 8000);
				$settings.service_settings[$settings.translation_service].validated = false;
			}
		}
	}

	// Trigger: if either language was changed, update text_to if auto-translate is enabled
	$: $settings.language_from, $settings.language_to, ($settings.service_settings[$settings.translation_service].auto_translate ? (
		translate()
	) : (true));

	$: $data.available_languages, selectable_languages = Array.from($data.available_languages)
		.map((locale) => {const language = $data.all_languages.get(locale);return {'value': locale, 'text': language ? language : locale};})
		.sort((a, b) => a.text.localeCompare(b.text))
</script>

<View>
	<NavHeader slot="header"
			   buttons={[
			   {
				   icon: "cloud",
				   tooltip: "Change Translation Service",
				   onClick: () => new SwitchService(app, plugin).open(),
			   },
			   {
				   icon: $settings.service_settings[$settings.translation_service].auto_translate ? "zap" : "hand",
				   tooltip: "Turn auto-translate " + ($settings.service_settings[$settings.translation_service].auto_translate ? "off" : "on"),
				   onClick: () => {
					   $settings.service_settings[$settings.translation_service].auto_translate =
					   !$settings.service_settings[$settings.translation_service].auto_translate;
				   }
			   },
			   {
				   icon: $settings.service_settings[$settings.translation_service].filter_type === 0 ? "asterisk" :
				   		 $settings.service_settings[$settings.translation_service].filter_type === 1 ? "repeat" :
				   		 																					  "filter",
				   tooltip: $settings.service_settings[$settings.translation_service].filter_type === 0 ? "Show all available languages" :
				   		 	$settings.service_settings[$settings.translation_service].filter_type === 1 ? "Show only spellchecker languages" :
				   		 																					  	 "Show manually selected languages",
				   onClick: () => {
					   $settings.service_settings[$settings.translation_service].filter_type =
					   ($settings.service_settings[$settings.translation_service].filter_type + 1) % 3;
				   }
			   }]}
	/>

	<div slot="view" class="translator-view">
		<!-- TODO: Make the field resizable (save data)-->
		<!-- TODO: Event should only be triggered when the user is done typing (?) (count delay)-->
		<div class="translator-column">
			<Dropdown
				value={$settings.language_from}
				options={
				[
					$data.detected_language ? {value: 'auto', text: `Detect Language (${$data.all_languages.get($data.detected_language)})`} : {value: 'auto', text: 'Detect Language'},
					...selectable_languages,
				]
		}
				onChange={(e) => {
			$settings.language_from = e.target.value;
			$data.detected_language = undefined;
		}}
			/>
			<TextArea
				class="translator-textarea"
				text={$data.text_from}
				onChange={async (e) => {
			$data.text_from = e.target.value;
			if ($settings.service_settings[$settings.translation_service].auto_translate)
				await translate();
		}}
			/>
		</div>


		<div class="translator-button-container">
			<button class="translator-button"
					on:click={async () => {
						if ($settings.language_from === 'auto') {
							if ($data.detected_language) {
								[$settings.language_from, $settings.language_to] = [$settings.language_to, $data.detected_language];
								$data.detected_language = undefined;
							} else
								$settings.language_from = $data.available_languages[0];
						} else {
							[$settings.language_from, $settings.language_to] = [$settings.language_to, $settings.language_from];
						}
						[$data.text_from, $data.text_to] = [$data.text_to, $data.text_from];
					}}
			>
					<Icon icon=switch size={20}/>
			</button>

			{#if !$settings.service_settings[$settings.translation_service].auto_translate}
				<button class="translator-button" on:click={async () => {await translate();}}>
					<Icon icon=translate size={20}/>
				</button>
			{/if}

		</div>


		<div class="translator-column">
			<Dropdown
				value={$settings.language_to}
				options={selectable_languages}
				onChange={(e) => {
			$settings.language_to = e.target.value;
		}}
			/>
			<TextArea
				class="translator-textarea"
				text={$data.text_to}
				readonly={true}
			/>
		</div>
		<div class="translator-service-text">
			<a href={services[$settings.translation_service].url} class="icon-text">
				<Icon icon={$settings.translation_service}/>
				{`Using ${$settings.translation_service.replace('_', ' ')}`}
			</a>
			{#if services[$settings.translation_service].attribution !== undefined}
				<Icon icon={$settings.translation_service + '_attribution'} size={40} svg_size={[160, 40]}/>
			{/if}

		</div>
	</div>
</View>

