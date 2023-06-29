<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, glossary, all_languages, fasttext_data} from "../../../stores";

	import { Dropdown, Toggle } from "../../components";
	import {SettingItem} from "../../obsidian-components";


	export let plugin: TranslatorPlugin;

	const current_all_languages = Array.from($all_languages.entries()).map(([key, value]) => {
		return {
			value: key,
			text: value
		}
	}).sort((a, b) => a.text.localeCompare(b.text));


	const glossary_selected_info = {
		both: "Online glossary will be applied first, if it is not available, the local glossary will be used instead",
		online: "Only the online glossary will be applied",
		local: "Only the local glossary will be applied"
	}

	$: target_language_preference = {
		last: `Translate to last used language by default (${$all_languages.get($settings.last_used_target_languages.last())})`,
		display:`Translate to display language by default (${$all_languages.get(plugin.current_language)})`,
		specific: `Translate to manually selected language (${$all_languages.get($settings.default_target_language)})`
	}
</script>

<SettingItem
	name="Apply glossary"
	type="toggle"
	description="Translate sentences using provided glossary terms"
	notices={[
		{ type: 'text', text: 'Setting applies only to global commands (e.g. translating selections), enable separately for the translation view', style: 'translator-info-text' },
		$fasttext_data.binary ? null : { type: 'text', text: `This option requires <b>FastText</b> to resolve the language of the input text`, style: 'translator-warning-text' },
	]}
>
	<Toggle slot="control" value={$settings.apply_glossary}
		onChange={ async () => {
			$settings.apply_glossary = !$settings.apply_glossary;
		}}
	/>
</SettingItem>

{#if $settings.apply_glossary}
	<SettingItem
		name="Glossary preference"
		class="translator-setting-subsetting"
		type="dropdown"
		description="Determine whether glossary operation should be applied locally or by the online service"
		notices={[
			{ type: 'text', text: glossary_selected_info[$settings.glossary_preference] , style: 'translator-info-text' }
		]}
	>
		<Dropdown
			slot="control"
			options={[
				{"value": 'both', "text": 'Both online and local'},
				{"value": 'online', "text": 'Only online'},
				{"value": 'local', "text": 'Only local'},
			]}
			value={ $settings.glossary_preference }
			onChange={async (e) => {
				$settings.glossary_preference = e.target.value;
			}}
		/>
	</SettingItem>

	<SettingItem
		name="Case insensitive glossary"
		class="translator-setting-subsetting"
		description="Local glossary will attempt to match terms regardless of case"
		type="toggle"
	>
		<Toggle slot="control" value={$settings.case_insensitive_glossary}
			onChange={ async () => {
				$settings.case_insensitive_glossary = !$settings.case_insensitive_glossary;
				for (let key in glossary.dicts)
					glossary.replacements[key] = new RegExp(glossary.replacements[key],
															$settings.case_insensitive_glossary ? "gi" : "g");
			}}
		/>
	</SettingItem>
{/if}

<SettingItem
	name="Switch button action"
	description="<b>Translation view</b>: determine which action will be executed when pressing the language switch button"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={[{"value": "switch-both", "text": "Switch language and text"}, {"value": "switch-text", "text": "Switch text"}, {"value": "switch-language", "text": "Switch languages"}]}
		value={ $settings.switch_button_action }
		onChange={(e) => {
			$settings.switch_button_action = e.target.value;
		}}
	>
	</Dropdown>
</SettingItem>

<SettingItem
	name="Translate action"
	description="Determines how the text selection will be translated using translate <i>commands</i>"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={[{"value": "replace", "text": "Replace input with translation"}, {"value": "below", "text": "Translation added below input"}, {"value": "clipboard", "text": "Copy to clipboard"}]}
		value={ $settings.translation_command_action }
		onChange={(e) => {
			$settings.translation_command_action = e.target.value;
		}}
	>
	</Dropdown>
</SettingItem>

<SettingItem
	name="Default source language"
	description="This will be the default source language used when opening a <i>translation view</i>"
>
	<Dropdown
		slot="control"
		options={[{value: "auto", text: "Detect automatically"}].concat(current_all_languages)}
		value={$settings.default_source_language}
		onChange={async (e) => {
			$settings.default_source_language = e.target.value;
		}}
		type="text"
	/>
</SettingItem>

<SettingItem
	name="Default target language"
	description="This will determine which language will be translated to by default"
	notices={[
		{ type: 'text', text: target_language_preference[$settings.target_language_preference] , style: 'translator-info-text' }
	]}
>
	<Dropdown
		slot="control"
		options={[
			{value: "last", text: "Most recently used"},
			{value: "display", text: "Display language"},
			{value: "specific", text: "Manually select language"}
		]}
		value={ $settings.target_language_preference }
		onChange={(e) => {
			$settings.target_language_preference = e.target.value;
		}}
	/>
</SettingItem>

{#if $settings.target_language_preference === 'specific'}
	<SettingItem
		name="Select target language"
		class="translator-setting-subsetting"
		description="Set the default target language"
	>
		<Dropdown
			slot="control"
			options={current_all_languages}
			value={ $settings.default_target_language }
			onChange={(e) => {
				$settings.default_target_language = e.target.value;
			}}
		/>
	</SettingItem>
{/if}
