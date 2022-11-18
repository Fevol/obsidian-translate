<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, hide_shortcut_tooltips} from "../../../stores";

	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	export let plugin: TranslatorPlugin;

	let obfuscate_keys = app.loadLocalStorage(`obfuscate_keys`) || false;
	let hide_shortcut_tooltips_toggle = app.loadLocalStorage(`hide_shortcut_tooltips_toggle`) || false;
</script>


<SettingItem
	name="Enable plugin animations"
	type="toggle"
	notices={[
		{ type: 'text', text: `Disabling this setting might introduce some visual bugs`, style: 'warning-text'}
	]}

>
	<Toggle
		slot="control"
		value={ $settings.enable_animations }
		onChange={async (e) => {
			 $settings.enable_animations = !$settings.enable_animations;
		}}
	>
	</Toggle>
</SettingItem>

<SettingItem
	name="Hide attribution info in the translation view"
	type="toggle"
>
	<Toggle
		slot="control"
		value={ $settings.hide_attribution }
		onChange={async (e) => {
			 $settings.hide_attribution = !$settings.hide_attribution;
		}}
	>
	</Toggle>
</SettingItem>

<SettingItem
	name="Garble sensitive data"
	description="Obfuscate sensitive data such as API keys and tokens"
	notices={[
		{ type: 'text', text: `Useful for sharing a screenshot of your settings without showing the secret data`, style: 'info-text' }
	]}
	type="toggle"
>
	<Toggle
		slot="control"
		value={ obfuscate_keys }
		onChange={async (e) => {
			obfuscate_keys = !obfuscate_keys;
		 	app.saveLocalStorage('obfuscate_keys', obfuscate_keys);
		}}
	>
	</Toggle>
</SettingItem>

<SettingItem
	name="Hide shortcut tooltips"
	description="Do not show the keys required to trigger the button's shortcut"
	type="toggle"
>
	<Toggle
		slot="control"
		value={ hide_shortcut_tooltips_toggle }
		onChange={async (e) => {
			hide_shortcut_tooltips_toggle = !hide_shortcut_tooltips_toggle;
		 	app.saveLocalStorage('hide_shortcut_tooltips_toggle', hide_shortcut_tooltips_toggle);
			$hide_shortcut_tooltips = hide_shortcut_tooltips_toggle;
		}}
	>
	</Toggle>
</SettingItem>
