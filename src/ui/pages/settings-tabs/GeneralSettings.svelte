<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {
		all_languages,
		available_translator_services,
		password,
		passwords_are_encrypted,
		settings,
		settings_tab
	} from "../../../stores";

	import {Button, Dropdown, ButtonList, SettingItem} from "../../components";
	import {slide} from "svelte/transition"

	import {PasswordModal, PasswordRequestModal, TextModal} from "../../modals";

	import {
		SERVICES_INFO,
		SECURITY_MODES,
	} from "../../../constants";
	import {openGithubIssueLink} from "../../../obsidian-util";
	import {ALL_SERVICES} from "../../../types";

	export let plugin: TranslatorPlugin;

	$: selectable_services = ALL_SERVICES.filter((service) => !$settings.filtered_services.includes(service));

	// const example_languages = ['en', 'fr', 'zh']
	// Fun aside, let's people learn what the name of a language looks like in the native languages
	const example_languages: string[] = [...$all_languages.keys()].sort(() => 0.5 - Math.random()).slice(0, 3);
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
			$settings.service_settings[service as keyof typeof $settings.service_settings].api_key = undefined;
		} else if (old_mode === "local_only") {
			localStorage.removeItem(`${plugin.app.appId}-${service}_api_key`);
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
			if (SERVICES_INFO[service as keyof typeof SERVICES_INFO].requires_api_key) {
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
		{ text: `Used for the editor context menu and translating files`, type: 'info' }
	]}
	type="dropdown"
>
	<div slot="control" class="translator-flex-row-element">
		<Dropdown
			options={$available_translator_services
			//.filter(service => SERVICES_INFO[service].type === 'translation')
			.map(service => {
				return {'value': service, 'text': SERVICES_INFO[service].display_name};
		})}
			value={ $settings.translation_service }
			onChange={(value) => {
				$settings.translation_service = value;
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
		onChange={(value) => {
			$settings.filter_mode = value;
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
		onChange={(value) => {
			$settings.display_language = value;
			setTimeout(() => {
				display_language_example = generateLanguageExample();
			}, 30);
		}}
	/>
</SettingItem>

<SettingItem
	name="Storage settings for plugin authentication data"
	description="Determine how API keys will be stored on the device"
	type="dropdown"
	notices={[
		{ text: `${SECURITY_MODES.find(x => x.value === $settings.security_setting).info}`, type: 'info' }
	]}
>
	<Dropdown
		slot="control"
		options={SECURITY_MODES}
		value={ $settings.security_setting }
		onChange={async (value) => {
			await updateAPIKeys($settings.security_setting, value);
			$settings.security_setting = value;
		}}
	/>
</SettingItem>


{#if $settings.security_setting === 'password'}
	<SettingItem
		name="Password"
		type="password"
		subsetting={true}
		description="Update locally stored password"
	>
		<div slot="control">
			{#if !$passwords_are_encrypted}
				<Button
					class={!$password ? 'svelcomlib-success' : ''}
					tooltip={!$password ? 'No password is set' : 'Set a new password'}
					text={!$password ? 'Set password' : 'Update password'}
					onClick={ () => new PasswordModal(plugin.app, plugin).open() }
				/>
			{:else}
				<Button
					class='svelcomlib-fail'
					text="Decrypt API keys"
					tooltip='API keys are still encrypted'
					onClick={ () => new PasswordRequestModal(plugin).open() }
				/>
			{/if}
		</div>
	</SettingItem>
{/if}


<SettingItem
	name="Filter services"
	description="Only the selected services will be visible in settings, modals and commands"
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
			onChange={(value) => {
				if ($settings.filtered_services.length + 1 === ALL_SERVICES.length)
					$settings.filtered_services = [];
				else
					$settings.filtered_services = [...$settings.filtered_services, value];
				plugin.reactivity.filterAvailableServices();
			}}
		/>
	</div>
</SettingItem>

<div class="translator-important-buttons">
	<Button
		class="translator-important-button"
		text="DISCLAIMER"
		icon="scale"
		onClick={ () => new TextModal(plugin, "Legal information", `
	THIS SERVICE MAY CONTAIN TRANSLATIONS POWERED BY GOOGLE. GOOGLE DISCLAIMS ALL WARRANTIES RELATED TO THE TRANSLATIONS, EXPRESS OR IMPLIED, INCLUDING ANY WARRANTIES OF ACCURACY, RELIABILITY, AND ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	<br>`).open() }
	/>

	<Button
		class="translator-important-button svelcomlib-fail"
		text="REPORT BUG"
		icon="bug"
		onClick={ () => openGithubIssueLink(
			plugin.app,
			undefined,
			{
				selected_service: $settings.translation_service,
			}
		) }
	/>
</div>

