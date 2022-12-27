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
</script>

<SettingItem
	name="Apply glossary"
	type="toggle"
	description="If one is available, online glossary will be applied to global commands (file translate, ...)"
	notices={[
		$fasttext_data.binary ? null : { type: 'text', text: `This option requires <b>FastText</b> to resolve the language of the input text`, style: 'translator-warning-text' },
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
		{ type: 'text', text: `Glossary terms may not properly get translated`, style: 'translator-info-text' },
		$fasttext_data.binary ? null : { type: 'text', text: `This option requires <b>FastText</b> to resolve the language of the input text`, style: 'translator-warning-text' },
	]}
>
	<Toggle slot="control" value={$settings.local_glossary}
			onChange={ async () => {
			$settings.local_glossary = !$settings.local_glossary;
			if ($settings.local_glossary && !Object.keys(glossary.dicts).length) {
				let loaded_glossaries = null;
				if (await app.vault.adapter.exists(`${app.vault.configDir}/plugins/translate/glossary.json`))
					loaded_glossaries = await app.vault.adapter.read(`${app.vault.configDir}/plugins/translate/glossary.json`);
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
	description="This will be the default source language used when opening a translation view"
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
	description="This will be the default target language used when opening a translation view"
	notices={[
		{ type: 'text', text: `Language will also be shown first when using translation commands`, style: 'translator-info-text' }
	]}
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
