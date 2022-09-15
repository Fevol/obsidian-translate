<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import type {Writable} from "svelte/store";

	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	import {PasswordModal, PasswordRequestModal} from "../../modals";

	import type {PluginData, TranslatorPluginSettings} from "../../../types";
	import {SERVICES_INFO, SECURITY_MODES, DEFAULT_SETTINGS} from "../../../constants";

	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;


	// const example_languages = ['en', 'fr', 'zh']
	// Fun aside, let's people learn what the name of a language looks like in the native languages
	const example_languages = [...$data.all_languages.keys()].sort(() => 0.5 - Math.random()).slice(0, 3);
	let display_language_example = generateLanguageExample();

	function generateLanguageExample() {
		return example_languages.map((lang) => $data.all_languages.get(lang)).join(', ');
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
	description="Service used for executing <i>global commands</i>"
	notices={[
		{ type: 'text', text: `ⓘ Used for the editor context menu and translating files`, style: 'info-text' }
	]}
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={Object.entries(SERVICES_INFO)
			.filter(([k,v]) => v.type === 'translation')
			.map(([k,v]) => {
				return {'value': k, 'text': v.display_name};
		})}
		value={ $settings.translation_service }
		onChange={(e) => {
			// If translation service data does not exist in settings, add it
			if (!$settings.service_settings[e.target.value])
				$settings.service_settings[e.target.value] = DEFAULT_SETTINGS.service_settings[e.target.value];
			$settings.translation_service = e.target.value;
		}}
	>

	</Dropdown>
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
	>
	</Dropdown>

</SettingItem>

<SettingItem
	name="Security settings for authentication data"
	description="Determine how API keys will be stored on the device"
	type="dropdown"
	notices={[
		{ type: 'text', text: `ⓘ ${SECURITY_MODES.find(x => x.value === $settings.security_setting).info}`, style: 'info-text' }
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
	>
	</Dropdown>
</SettingItem>


{#if $settings.security_setting === 'password'}
	<SettingItem
		name="Password"
		type="password"
		description="Update locally stored password"
	>
		<div slot="control">
			{#if !$data.password_are_encrypted}
				<Button
					class={!$data.password ? 'translator-success' : ''}
					tooltip={!$data.password ? 'No password is set' : 'Set a new password'}
					text={!$data.password ? 'Set password' : 'Update password'}
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
	name="Model path"
	description="Determine where in the '.obsidian' folder local models should be stored"
	notices={[{ type: 'text', text: `⚠ You cannot nest this folder`, style: 'warning-text'}] }
	type="input"
>
	<!-- FIXME: Currently the path gets renamed as the user types, probably very heavy on the FS	-->
	<Input
		slot="control"
		val={$settings.storage_path}
		onChange={async (e) => {
			let path = e.target.value.replace(/[/\\?%*:|\"<>]/g, '-');

			if (!path) {
				new plugin.message_queue('Path cannot be empty');
				return;
			}

			if (await app.vault.adapter.exists(`.obsidian/${path}`)) {
				new plugin.message_queue('This directory already exists');
				return;
			}


			if (await app.vault.adapter.exists(`.obsidian/${$settings.storage_path}`))
				await app.vault.adapter.rename(`.obsidian/${$settings.storage_path}`, `.obsidian/${path}`);
			$settings.storage_path = path;

			// In case the bergamot translator was already set up, update its path data
			const bergamot_translator = plugin.reactivity.getExistingService('bergamot');
			if (bergamot_translator)
				bergamot_translator.update_data(null, path);
		}}
		type="text"
	/>
</SettingItem>


<SettingItem
	name="Enable plugin animations"
	type="toggle"
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
