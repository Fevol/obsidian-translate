<script>
	import {Toggle, Dropdown} from "../components";
	import {SettingItem} from "../obsidian-components";

	import {settings} from "stores";
	import {createEventDispatcher} from "svelte";

	import {SERVICES_INFO} from "../../constants";
	import {available_services} from "../../stores";


	const dispatch = createEventDispatcher()

	export let translation_service = "";
	export let auto_translate = false;
	export let apply_glossary = false;
	export let filter_mode = 0;
</script>


<SettingItem
	name="Translation Service"
	description="Set the service used for <i>this</i> view"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={$available_services
			//.filter(service => SERVICES_INFO[service].type === 'translation')
			.map(service => {
				return {'value': service, 'text': SERVICES_INFO[service].display_name};
		})}
		value={ translation_service }
		onChange={(e) => { translation_service = e.target.value; }}
	/>
</SettingItem>

<SettingItem
	name="Automatic translate"
	description="Translate text as it is being typed"
	type="toggle"
	notices={[
		...($settings.service_settings[translation_service]?.auto_translate ? [] : [
			{text: `The 'automatic translation' setting for ${SERVICES_INFO[translation_service].display_name} is not activated, enable it via the service's settings tab`, style: "translator-warning-text"}
		]),
	 {text: "The delay for the automatic translation can be set in the global translation service settings", style: "translator-info-text"},
	]}
>
	<Toggle
		slot="control"
		value={ auto_translate }
		disabled={ !$settings.service_settings[translation_service]?.auto_translate }
		onChange={(val) => { auto_translate = val; }}
	/>
</SettingItem>

<SettingItem
	name="Apply glossary"
	description="Replace words with their glossary translation"
	type="toggle"
	notices={$settings.apply_glossary ? [] :
		[{text: "Global 'glossary' option has not been activated yet, you can enable it in the 'Functionality' settings tab", style: "translator-warning-text"}]
	}
>
	<Toggle
		slot="control"
		disabled={ !$settings.apply_glossary }
		value={ apply_glossary }
		onChange={(val) => { apply_glossary = val; }}
	/>
</SettingItem>


<SettingItem
	name="Filter mode"
	description="Set which languages are visible for this view"
	type="dropdown"
	notices={[
		{text: "Manual language selection can be set in the service's settings", style: "translator-info-text"},
	]}
>
	<Dropdown
		slot="control"
		options={[
			{"value": 0, "text": 'All languages'},
			{"value": 1, "text": 'Spellchecker languages'},
			{"value": 2, "text": 'Manually selected languages'}
		]}
		value={ filter_mode }
		onChange={(e) => { filter_mode = parseInt(e.target.value); }}
	/>
</SettingItem>

<div class="translator-confirmation-buttons">
	<button on:click={async () => dispatch("close")}>
		Cancel
	</button>

	<button class="translator-success"
			on:click={async () => {
				dispatch("close", { translation_service, auto_translate, apply_glossary, filter_mode });
			}}>
		Confirm
	</button>
</div>
