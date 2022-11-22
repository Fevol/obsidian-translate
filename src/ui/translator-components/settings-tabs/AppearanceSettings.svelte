<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, hide_shortcut_tooltips} from "../../../stores";

	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	import {
		QUICK_ACTIONS, QUICK_ACTIONS_BUTTONS,
		QUICK_SETTINGS, QUICK_SETTINGS_BUTTONS,
		VIEW_MODES
	} from "../../../constants";

	export let plugin: TranslatorPlugin;

	let obfuscate_keys = app.loadLocalStorage(`obfuscate_keys`) || false;
	let hide_shortcut_tooltips_toggle = app.loadLocalStorage(`hide_shortcut_tooltips_toggle`) || false;

	const available_quicksettings = QUICK_SETTINGS_BUTTONS.map((button) => {
		return { text: button.text, value: button.id };
	});
	const available_quickactions = QUICK_ACTIONS_BUTTONS.map((button) => {
		return { text: button.text, value: button.id };
	});

	$: top_quickbuttons = Array.from($settings.quicksettings_default).map((id) => {
		return { value: id, text: QUICK_SETTINGS[id].text,  };
	});
	$: left_quickactions = $settings.left_quickactions_default.map((id) => {
		return { value: id, text: QUICK_ACTIONS[id].text, };
	});
	$: right_quickactions = $settings.right_quickactions_default.map((id) => {
		return { value: id, text: QUICK_ACTIONS[id].text, };
	})
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



<SettingItem
	name="Translation View Defaults"
	type="heading"
/>

<SettingItem
	name="Change default quicksettings"
	type="toggle"
>
	<div slot="control" class="setting-item-control">
		<ButtonList
			items={ top_quickbuttons }
			icon="cross"
			onClick={(service, index) => {
				$settings.quicksettings_default.splice(index, 1);
				$settings.quicksettings_default = $settings.quicksettings_default;
			}}
		/>
		<Dropdown
			options={ available_quicksettings }
			value=""
			onChange={(e) => {
				$settings.quicksettings_default = [...$settings.quicksettings_default, e.target.value];
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Change default layout"
>
	<Dropdown
		slot="control"
		class="translator-select"
		value={$settings.layout_default}
		options={[
			{ value: 0, text: 'Automatic', },
			{ value: 1, text: 'Vertical', },
			{ value: 2, text: 'Mixed', },
			{ value: 3, text: 'Horizontal', }
		]}
		onChange={(e) => {
			$settings.layout_default = parseInt(e.target.value);
		}}
	/>
</SettingItem>

<SettingItem
	name="Change default <b>left</b> quickactions"
	type="toggle"
>
	<div slot="control" class="setting-item-control">
		<ButtonList
			items={ left_quickactions }
			icon="cross"
			onClick={(service, index) => {
				$settings.left_quickactions_default.splice(index, 1);
				$settings.left_quickactions_default = $settings.left_quickactions_default;
			}}
		/>
		<Dropdown
			options={ available_quickactions }
			value=""
			onChange={(e) => {
				$settings.left_quickactions_default = [...$settings.left_quickactions_default, e.target.value];
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Change default <b>right</b> quickactions"
	type="toggle"
>
	<div slot="control" class="setting-item-control">
		<ButtonList
			items={ right_quickactions }
			icon="cross"
			onClick={(service, index) => {
				$settings.right_quickactions_default.splice(index, 1);
				$settings.right_quickactions_default = $settings.right_quickactions_default;
			}}
		/>
		<Dropdown
			options={ available_quickactions }
			value=""
			onChange={(e) => {
				$settings.right_quickactions_default = [...$settings.right_quickactions_default, e.target.value];
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Hide attribution info"
	type="toggle"
>
	<Toggle
		slot="control"
		value={ $settings.hide_attribution_default }
		onChange={async (e) => {
			 $settings.hide_attribution_default = !$settings.hide_attribution_default;
		}}
	>
	</Toggle>
</SettingItem>
