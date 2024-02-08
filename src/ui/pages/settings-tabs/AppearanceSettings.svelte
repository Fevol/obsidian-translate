<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, hide_shortcut_tooltips} from "../../../stores";

	import {Dropdown, Toggle, ButtonList, SettingItem} from "../../components";

	import {
		QUICK_ACTIONS, QUICK_ACTIONS_BUTTONS,
		QUICK_SETTINGS, QUICK_SETTINGS_BUTTONS
	} from "../../../constants";

	export let plugin: TranslatorPlugin;

	let obfuscate_keys = plugin.app.loadLocalStorage(`obfuscate_keys`) || false;
	let hide_shortcut_tooltips_toggle = plugin.app.loadLocalStorage(`hide_shortcut_tooltips_toggle`) || false;

	const available_quicksettings = QUICK_SETTINGS_BUTTONS.map((button) => {
		return { text: button.text, value: button.id };
	});
	const available_quickactions = QUICK_ACTIONS_BUTTONS.map((button) => {
		return { text: button.text, value: button.id };
	});

	$: top_quickbuttons = Array.from($settings.quicksettings_default).map((id) => {
		return { value: id, text: QUICK_SETTINGS[id as keyof typeof QUICK_SETTINGS].text,  };
	});
	$: left_quickactions = $settings.left_quickactions_default.map((id) => {
		return { value: id, text: QUICK_ACTIONS[id as keyof typeof QUICK_ACTIONS].text, };
	});
	$: right_quickactions = $settings.right_quickactions_default.map((id) => {
		return { value: id, text: QUICK_ACTIONS[id as keyof typeof QUICK_ACTIONS].text, };
	})
</script>

<SettingItem
	name="General appearance settings"
	type="heading"
/>

<SettingItem
	name="Enable plugin animations"
	type="toggle"
	notices={[
		{ text: `Disabling this setting might introduce some visual bugs`, type: 'warning'}
	]}

>
	<Toggle
		slot="control"
		value={ $settings.enable_animations }
		onChange={async (value) => {
			 $settings.enable_animations = value;
		}}
	>
	</Toggle>
</SettingItem>

<SettingItem
	name="Garble sensitive data"
	description="Obfuscate sensitive data such as API keys and tokens"
	notices={[
		{ text: `Useful for sharing a screenshot of your settings without showing the secret data`, type: 'info' }
	]}
	type="toggle"
>
	<Toggle
		slot="control"
		value={ obfuscate_keys }
		onChange={async (value) => {
			obfuscate_keys = value;
		 	plugin.app.saveLocalStorage('obfuscate_keys', obfuscate_keys);
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
		onChange={async (value) => {
			hide_shortcut_tooltips_toggle = value;
		 	plugin.app.saveLocalStorage('hide_shortcut_tooltips_toggle', hide_shortcut_tooltips_toggle);
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
			onChange={(value) => {
				$settings.quicksettings_default = [...$settings.quicksettings_default, value];
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Change default layout"
>
	<Dropdown
		slot="control"
		value={$settings.layout_default}
		options={[
			{ value: 0, text: 'Automatic', },
			{ value: 1, text: 'Vertical', },
			{ value: 2, text: 'Mixed', },
			{ value: 3, text: 'Horizontal', }
		]}
		onChange={(value) => {
			$settings.layout_default = parseInt(value);
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
			onChange={(value) => {
				$settings.left_quickactions_default = [...$settings.left_quickactions_default, value];
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
			onChange={(value) => {
				$settings.right_quickactions_default = [...$settings.right_quickactions_default, value];
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
		onChange={async (value) => {
			 $settings.hide_attribution_default = value;
		}}
	>
	</Toggle>
</SettingItem>
