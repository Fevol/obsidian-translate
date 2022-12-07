<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {
		all_languages,
		available_services,
		password,
		passwords_are_encrypted,
		settings,
		settings_tab
	} from "../../../stores";

	import {Button, Dropdown, ButtonList} from "../../components";
	import {SettingItem} from "../../obsidian-components";
	import {slide} from "svelte/transition"

	import {PasswordModal, PasswordRequestModal, TextModal} from "../../modals";

	import {SERVICES_INFO, SECURITY_MODES, ALL_SERVICES} from "../../../constants";

	export let plugin: TranslatorPlugin;

	$: selectable_services = ALL_SERVICES.filter((service) => !$settings.filtered_services.includes(service));

	// const example_languages = ['en', 'fr', 'zh']
	// Fun aside, let's people learn what the name of a language looks like in the native languages
	const example_languages = [...$all_languages.keys()].sort(() => 0.5 - Math.random()).slice(0, 3);
	let display_language_example = generateLanguageExample();

	function generateLanguageExample() {
		return example_languages.map((lang) => $all_languages.get(lang)).join(', ');
	}


	/**
	 * @public: Removes the API key of a service depending on the security mode.
	 *
	 * @param service - The service to remove the API key from
	 * @param old_mode - The previous security mode
	 * @param new_mode - The new security mode
	 */
	function clearAPIKey(service: string, old_mode: string, new_mode: string) {
		if ((old_mode === "none" || old_mode === "password") && !(new_mode === "none" || new_mode === "password")) {
			$settings.service_settings[service].api_key = undefined;
		} else if (old_mode === "local_only") {
			localStorage.removeItem(`${app.appId}-${service}_api_key`);
		} else if (old_mode === "dont_save") {
			sessionStorage.removeItem(service + '_api_key');
		}
	}

	/**
	 * @public: Update the API keys of all services on a security mode change.
	 *
	 * @param old_mode - The previous security mode
	 * @param new_mode	- The new security mode
	 */
	async function updateAPIKeys(old_mode: string, new_mode: string) {
		for (let service in $settings.service_settings) {
			if (SERVICES_INFO[service].requires_api_key) {
				await plugin.reactivity.setAPIKey(service, new_mode, (await plugin.reactivity.getAPIKey(service, old_mode)) || '');
				clearAPIKey(service, old_mode, new_mode);
			}
		}
	}

</script>

<SettingItem
	name="Translation Service"
	description="Service used for the plugin's <i>commands</i>"
	notices={[
		{ type: 'text', text: `Used for the editor context menu and translating files`, style: 'translator-info-text' }
	]}
	type="dropdown"
>
	<div slot="control" class="translator-flex-row-element">
		<Dropdown
			options={$available_services
			//.filter(service => SERVICES_INFO[service].type === 'translation')
			.map(service => {
				return {'value': service, 'text': SERVICES_INFO[service].display_name};
		})}
			value={ $settings.translation_service }
			onChange={(e) => {
			$settings.translation_service = e.target.value;
		}}
		/>
		<Button
			class="clickable-icon setting-editor-extra-setting-button translator-mobile-button"
			icon="user-cog"
			tooltip="Open service's settings"
			onClick={() => {
				$settings_tab = $settings.translation_service;
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Filter language selection"
	description="Selection of languages available for <i>global commands</i>"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={ [
			{"value": "0", "text": 'All languages'},
			{"value": "1", "text": 'Spellchecker languages'},
			{"value": "2", "text": 'Manually selected languages'}
		] }
		value={$settings.filter_mode}
		onChange={(e) => {
			$settings.filter_mode = e.target.value;
		}}
	/>
</SettingItem>

<SettingItem
	name="Language display name"
	description={`Example: <i>${display_language_example}</i>`}
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={[{"value": "display", "text": "Display language"}, {"value": "local", "text": "Native language"}]}
		value={ $settings.display_language }
		onChange={(e) => {
			$settings.display_language = e.target.value;
			setTimeout(() => {
				display_language_example = generateLanguageExample();
			}, 30);
		}}
	/>
</SettingItem>

<SettingItem
	name="Security settings for authentication data"
	description="Determine how API keys will be stored on the device"
	type="dropdown"
	notices={[
		{ type: 'text', text: `${SECURITY_MODES.find(x => x.value === $settings.security_setting).info}`, style: 'translator-info-text' }
	]}
>
	<Dropdown
		slot="control"
		options={SECURITY_MODES}
		value={ $settings.security_setting }
		onChange={async (e) => {
			await updateAPIKeys($settings.security_setting, e.target.value);
			$settings.security_setting = e.target.value;
		}}
	/>
</SettingItem>


{#if $settings.security_setting === 'password'}
	<SettingItem
		name="Password"
		type="password"
		description="Update locally stored password"
	>
		<div slot="control">
			{#if !$passwords_are_encrypted}
				<Button
					class={!$password ? 'translator-success' : ''}
					tooltip={!$password ? 'No password is set' : 'Set a new password'}
					text={!$password ? 'Set password' : 'Update password'}
					onClick={ () => new PasswordModal(plugin.app, plugin).open() }
				/>
			{:else}
				<Button
					class='translator-fail'
					text="Decrypt API keys"
					tooltip='API keys are still encrypted'
					onClick={ () => new PasswordRequestModal(plugin).open() }
				/>
			{/if}
		</div>
	</SettingItem>
{/if}


<SettingItem
	name="Services selection"
	description="Show only the selected services in settings, modals and commands"
>
	<div slot="control" transition:slide class="setting-item-control">
		<ButtonList
			items={ $settings.filtered_services.map((service) => { return {'value': service, 'text': SERVICES_INFO[service].display_name}; }) }
			icon="cross"
			onClick={(service) => {
				$settings.filtered_services = $settings.filtered_services.filter(x => x !== service);
				plugin.reactivity.filterAvailableServices();
			}}
		/>
		<Dropdown
			options={ selectable_services.map((service) => { return {'value': service, 'text': SERVICES_INFO[service].display_name}; })}
			value=""
			onChange={(e) => {
				if ($settings.filtered_services.length + 1 === ALL_SERVICES.length)
					$settings.filtered_services = [];
				else
					$settings.filtered_services = [...$settings.filtered_services, e.target.value];
				plugin.reactivity.filterAvailableServices();
			}}
		/>
	</div>
</SettingItem>

<Button
	class="translator-license-button"
	text="DISCLAIMER"
	icon="scale"
	onClick={ () => new TextModal(plugin, "Legal information", `
	THIS SERVICE MAY CONTAIN TRANSLATIONS POWERED BY GOOGLE. GOOGLE DISCLAIMS ALL WARRANTIES RELATED TO THE TRANSLATIONS, EXPRESS OR IMPLIED, INCLUDING ANY WARRANTIES OF ACCURACY, RELIABILITY, AND ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	<br>`).open() }
/>
