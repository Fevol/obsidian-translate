<script lang="ts">
	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";

	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from ".././components";
	import {SettingItem} from "../obsidian-components";

	import {ConfirmationModal, PasswordModal, PasswordRequestModal} from "../modals";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
	import {SERVICES_INFO, SECURITY_MODES, DEFAULT_SETTINGS, SETTINGS_TABS, UNTESTED_SERVICES} from "../../constants";
	import {DummyTranslate} from "../../handlers";
	import {aesGcmDecrypt, aesGcmEncrypt} from "../../util";
	import {getAPIKey, setAPIKey} from "../../obsidian-util";



	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;
	export let translator: DummyTranslate;


	function clearAPIKey(service: string, old_mode: string, new_mode: string) {
		if ((old_mode === "none" || old_mode === "password") && !(new_mode === "none" || new_mode === "password")) {
			$settings.service_settings[service].api_key = undefined;
		} else if (old_mode === "local_only") {
			localStorage.removeItem(service + '_api_key');
		} else if (old_mode === "dont_save") {
			sessionStorage.removeItem(service + '_api_key');
		}
	}
	async function updateAPIKeys(old_mode: string, new_mode: string) {
		for (let service in $settings.service_settings) {
			if (SERVICES_INFO[service].requires_api_key) {
				await setAPIKey(service, new_mode, (await getAPIKey(service, old_mode, $settings.service_settings)) || '', $settings.service_settings);
				clearAPIKey(service, old_mode, new_mode);
			}
		}
	}


</script>

<SettingItem
	name="Translation Service"
	notices={[
		{ type: 'text', text: `ⓘ Used in the editor context menu and for translating files`, style: 'info-text' }
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
	description="Determine which languages are available for the global commands"
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
	description="Determine how language names are displayed in the UI"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={[{"value": "display", "text": "Display language"}, {"value": "local", "text": "Native language"}]}
		value={ $settings.display_language }
		onChange={(e) => {
			$settings.display_language = e.target.value;
		}}
	>
	</Dropdown>

</SettingItem>

<SettingItem
	name="Security settings for API key"
	description="Determine how API keys are stored on the device"
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
				<!-- FIXME: Localstorage is not reactive -->
				<Button
					class={!localStorage.getItem('password') ? 'translator-success' : ''}
					tooltip={!localStorage.getItem('password') ? 'No password is set' : ''}
					text="Set new password"
					onClick={ () => new PasswordModal(plugin.app, plugin).open() }
				/>
			{:else}
				<Button
					class='translator-fail'
					text="Set password"
					tooltip='Passwords are still encrypted'
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
			if (await app.vault.adapter.exists(`.obsidian/${$settings.storage_path}`))
				await app.vault.adapter.rename(`.obsidian/${$settings.storage_path}`, `.obsidian/${path}`);
			$settings.storage_path = path;
			if (translator.valid && $settings.translation_service === 'bergamot')
				translator.update_data(null, path);
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
