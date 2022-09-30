<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, data} from "../../../stores";

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
		{ type: 'text', text: `ⓘ Used when opening a new view or when translating text without selecting a language`, style: 'info-text' }
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
