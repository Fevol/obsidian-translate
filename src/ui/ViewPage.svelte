<script lang="ts">
	import TranslatorPlugin from "../main";

	import type {Writable} from "svelte/store";
	import {Button, Dropdown, TextArea} from "./components";

	import type {PluginData, TranslatorPluginSettings} from "../types";
	import {TRANSLATION_SERVICES_INFO} from "../constants";
	import Icon from "./components/Icon.svelte";

	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;

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

	// $: $data.text_from, console.log($data.text_from, "updated");

	// Trigger: if either language was changed, update text_to if auto-translate is enabled
	$: $settings.language_from, $settings.language_to,  ($settings.service_settings[$settings.translation_service].auto_translate ? (
		translate()
	) : (true));

</script>


<div class="translator-view">
	<div class="translator-column">
		<Dropdown
			value={$settings.language_from}
			options={
				[
					$data.detected_language ? {value: 'auto', text: `Detect Language (${$data.all_languages.get($data.detected_language)})`} : {value: 'auto', text: 'Detect Language'},
					...Array.from($data.available_languages)
						.map((locale) => {return {'value': locale, 'text': $data.all_languages.get(locale)};})
						.sort((a, b) => a.text.localeCompare(b.text))
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
		<Button class="translator-button"
				icon="switch"
				size=20

				onClick={async () => {
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
		/>

		{#if !$settings.service_settings[$settings.translation_service].auto_translate}
			<Button class="translator-button"
					icon="translate"
					size=20
					onClick={async () => {
						await translate();
					}}
			/>
		{/if}

	</div>


	<div class="translator-column">
		<Dropdown
			value={$settings.language_to}
			options={Array.from($data.available_languages)
				.map((locale) => {return {'value': locale, 'text': $data.all_languages.get(locale)};})
				.sort((a, b) => a.text.localeCompare(b.text))
			}
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
			<Icon icon={$settings.translation_service} />
			{`Using ${$settings.translation_service.replace('_', ' ')}`}
		</a>
		{#if services[$settings.translation_service].attribution !== undefined}
			<Icon icon={$settings.translation_service + '_attribution'} size={40} svg_size={[160, 40]}/>
		{/if}

	</div>
</div>


<!--// this.service_used.empty();-->
<!--//-->
<!--// let icon_container = this.service_used.createDiv({'cls': 'icon-text'});-->
<!--//-->
<!--// let icon = icon_container.createDiv();-->
<!--//-->
<!--// setIcon(icon, this.plugin.settings.translation_service);-->
<!--// let span = icon_container.createEl('a',{-->
<!--	// 	cls: '',-->
<!--	// 	text: `Using ${this.plugin.settings.translation_service.replace('_', ' ')}`,-->
<!--	// 	href: TRANSLATION_SERVICES_INFO[this.plugin.settings.translation_service].url-->
<!--	// });-->
<!--//-->
<!--// this.updateSelection(this.left_select, "from");-->
<!--// this.updateSelection(this.right_select, "to");-->
<!--// await this.plugin.saveSettings();-->
<!--//-->
<!--// if ('attribution' in TRANSLATION_SERVICES_INFO[this.plugin.settings.translation_service]) {-->
<!--	// 	let attribution_icon = this.service_used.createDiv();-->
<!--	//-->
<!--	// 	// @ts-ignore-->
<!--	// 	attribution_icon.innerHTML = ICONS[TRANSLATION_SERVICES_INFO[this.plugin.settings.translation_service].attribution];-->
<!--	//-->
<!--	// 	// Get the icon from service_used-->
<!--	// 	let attribution = attribution_icon.children[0];-->
<!--	//-->
<!--	// 	// Scale the icon by a factor of 1.5-->
<!--	// 	let width: number, height: number;-->
<!--	// 	[width, height] = attribution.getAttribute("viewBox").split(" ").splice(2).map((x) => parseInt(x));-->
<!--	//-->
<!--	// 	let scaleX = 160 / width,-->
<!--	// 		scaleY = 40 / height;-->
<!--	// 	let scale = Math.min(scaleX, scaleY);-->
<!--	//-->
<!--	// 	attribution.setAttribute("width", (width * scale).toString());-->
<!--	// 	attribution.setAttribute("height", (height * scale).toString());-->
<!--	//-->
<!--	// }-->
