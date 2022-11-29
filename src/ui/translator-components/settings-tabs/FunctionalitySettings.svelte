<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, data, glossary} from "../../../stores";

	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	import {PasswordModal, PasswordRequestModal} from "../../modals";

	import type {PluginData, TranslatorPluginSettings} from "../../../types";
	import {SERVICES_INFO, SECURITY_MODES, DEFAULT_SETTINGS} from "../../../constants";

	export let plugin: TranslatorPlugin;

	const all_languages = Array.from($data.all_languages.entries()).map(([key, value]) => {
		return {
			value: key,
			text: value
		}
	}).sort((a, b) => a.text.localeCompare(b.text));
</script>

<SettingItem
	name="Apply glossary"
	type="toggle"
	description="If one is available, online glossary will be applied to global commands (file translate, ...)"
	notices={[
		{ type: 'text', text: `This option requires <b>FastText</b> to resolve the language of the input text`, style: 'warning-text' }
	]}
>
	<Toggle slot="control" value={$settings.apply_glossary}
			onChange={ async () => {
				$settings.apply_glossary = !$settings.apply_glossary;
			}}
	/>
</SettingItem>


<SettingItem
	name="Apply glossary <b>locally</b>"
	type="toggle"
	description="If no online glossary is available, glossary will be applied locally"
	notices={[
		{ type: 'text', text: `Glossary terms may not properly get translated`, style: 'info-text' },
		{ type: 'text', text: `This option requires <b>FastText</b> to resolve the language of the input text`, style: 'warning-text' }
	]}
>
	<Toggle slot="control" value={$settings.local_glossary}
			onChange={ async () => {
			$settings.local_glossary = !$settings.local_glossary;
			if ($settings.local_glossary && !Object.keys(glossary.dicts).length) {
				let loaded_glossaries = await app.vault.adapter.read(".obsidian/plugins/obsidian-translate/glossary.json");
				if (loaded_glossaries) {
					glossary.dicts = JSON.parse(loaded_glossaries);
					for (let key in glossary.dicts)
						glossary.replacements[key] = new RegExp(glossary.dicts[key].map((item) => item[0]).join("|"),
						$settings.case_insensitive_glossary ? "gi" : "g");
				}
			}
		}}
	/>
</SettingItem>

{#if $settings.local_glossary}
	<SettingItem
		name="Case insensitive glossary"
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
	description="Choose what action will be executed on pressing the language switch button"
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
	name="Default source language"
	description="Determine which language to translate from <i>by default</i>"
>
	<Dropdown
		slot="control"
		options={[{value: "auto", text: "Detect automatically"}].concat(all_languages)}
		value={$settings.default_source_language}
		onChange={async (e) => {
			$settings.default_source_language = e.target.value;
		}}
		type="text"
	/>
</SettingItem>

<SettingItem
	name="Default target language"
	description="Determine which language to translate to <i>by default</i>"
	notices={[
		{ type: 'text', text: `Used when opening a new view or when translating text without selecting a language`, style: 'info-text' }
	]}
>
	<Dropdown
		slot="control"
		options={all_languages}
		value={ $settings.default_target_language }
		onChange={(e) => {
			$settings.default_target_language = e.target.value;
		}}
	/>
</SettingItem>
