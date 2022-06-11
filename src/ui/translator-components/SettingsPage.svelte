<script lang="ts">
	import {Notice} from "obsidian";
	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";
	import {Button, Dropdown, Toggle, Input, Icon, ToggleButton, ButtonList} from ".././components";
	import {SettingItem} from "../obsidian-components";

	import type {PluginData, TranslatorPluginSettings} from "../../types";
	import {TRANSLATION_SERVICES_INFO} from "../../constants";

	import {toTitleCase} from "../../util";

	// export let plugin: TranslatorPlugin;
	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;
	let selectable_services: any[];

	$: {
		selectable_services = Array.from($data.all_languages)
			.map(([locale, name]) => { return {'value': locale, 'text': name} })
			.filter((option) => { return !$settings.service_settings[$settings.translation_service].selected_languages.contains(option.value); })
			.sort((a, b) => { return a.text.localeCompare(b.text);});
		selectable_services.unshift({'value': '', 'text': '+'});
	}

</script>

<h3>General Settings</h3>

<SettingItem
	name="Translation Service"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={Object.keys(TRANSLATION_SERVICES_INFO).map((x) => {
			return {'value': x, 'text': toTitleCase(x.replace('_', ' '))};
		})}
		value={ $settings.translation_service }
		onChange={(e) => {
			$settings.translation_service = e.target.value;
		}}
	>

	</Dropdown>
</SettingItem>

<SettingItem
	name="Language display name"
	description="Select in which language the language name should be displayed"
	type="dropdown"
>
	<Dropdown
		slot="control"
		options={[{"value": "display", "text": "Display"}, {"value": "local", "text": "Localised"}]}
		value={ $settings.display_language }
		onChange={(e) => {
			$settings.display_language = e.target.value;
		}}
	>
	</Dropdown>

</SettingItem>


{#each Object.entries(services) as [service, info]}
	{#if service === $settings.translation_service}
		<h2 class="icon-text translator-title">
			<Icon icon={service} size=22 />
			{toTitleCase(service.replace('_', ' '))}
		</h2>


		{#if $settings.service_settings[$settings.translation_service].filter_type !== 0}
			<SettingItem
				name="Translator languages"
				description="Choose languages to include in translator selection"
			>
				<div slot="control">
					<ButtonList
						items={Array.from($data.available_languages)
							.map((locale) => {return {'value': locale, 'text': $data.all_languages.get(locale)};})
							.sort((a, b) => a.text.localeCompare(b.text))}
						}
						icon="cross"
						disabled={$settings.service_settings[$settings.translation_service].filter_type === 1}
						onClick={(locale) => {
							$settings.service_settings[$settings.translation_service].selected_languages =
								$settings.service_settings[$settings.translation_service].selected_languages.filter((l) => l !== locale);
						}}
					/>
					<Dropdown
						options={ selectable_services }
						value=""
						disabled={$settings.service_settings[$settings.translation_service].filter_type === 1}
						onChange={(e) => {
							$settings.service_settings[$settings.translation_service].selected_languages =
							 [...$settings.service_settings[$settings.translation_service].selected_languages, e.target.value];
							e.target.value = "";
						}}
					/>
				</div>
			</SettingItem>
		{/if}

		<SettingItem
			name="Filter languages"
			description="Determine which languages should be available for translation"
			type="dropdown"
		>
			<Dropdown
				slot="control"
				options={ [
					{"value": "0", "text": 'Show all languages'},
					{"value": "1", "text": 'Sync with spellchecker'},
					{"value": "2", "text": 'Select languages manually'}
					] }
				value={$settings.service_settings[$settings.translation_service].filter_type.toString()}
				onChange={(e) => {
							$settings.service_settings[$settings.translation_service].filter_type = parseInt(e.target.value);
						}}
			/>
		</SettingItem>


		{#if $settings.service_settings[service].api_key !== null}
			<SettingItem
				name="API Key"
				description="API key for translation service"
				type="text"
			>
				<Input
					slot="control"
					val={$settings.service_settings[service].api_key}
					onChange={(e) => {
						$settings.service_settings[service].api_key = e.target.value;
						$settings.service_settings[service].validated = null;
					}}
					type="text"
				/>
			</SettingItem>

			{#if info.region_options !== undefined}
				<SettingItem
					name="Region"
					description="If applicable, set the issue region of the API key"
					type="dropdown"
				>
					<Dropdown
						slot="control"
						options={info.region_options}
						value={$settings.service_settings[service].region}
						onChange={(e) => {
							$settings.service_settings[service].region = e.target.value;
							$settings.service_settings[service].validated = null;
						}}
					/>
				</SettingItem>
			{/if}
		{/if}

		{#if $settings.service_settings[service].host !== null}
			<SettingItem
				name="Host"
				description="Enter the URL of the translation service"
				type="text"
				notices={[
					{ type: 'href', text: "🛈 You can host this service locally", url: info.local_host}
				]}
			>
				<Input
					slot="control"
					val={$settings.service_settings[service].host}
					onChange={(e) => {
						$settings.service_settings[service].host = e.target.value;
						$settings.service_settings[service].validated = null;
					}}
					type="text"
				/>
			</SettingItem>
		{/if}

		<SettingItem
			name="Validate"
			description="Ensure that the translation service is set-up properly"
			type="button"
		>
			<ToggleButton
				slot="control"
				value={$settings.service_settings[service].validated}
				fn={async () => {
					let [valid, error_message] = await plugin.translator.validate();
					if (error_message)
						plugin.message_queue(error_message);
					$settings.service_settings[service].validated = valid;
					return valid;
				}}
			/>
		</SettingItem>


		<SettingItem
			name="Automatic translate"
			description="Translate text as it is being typed"
			type="text"
			notices={[
				{text: "⚠ May quickly use up the API's character quota", style: 'warning-text'}
			]}
		>
			<Toggle
				slot="control"
				value={ $settings.service_settings[service].auto_translate }
				onChange={(val) => {
					$settings.service_settings[service].auto_translate = val;
				}}
			/>
		</SettingItem>

		<SettingItem
			name="Update Languages"
			description="Update the list of available languages"
		>
			<Button
				slot="control"
				icon="switch"
				onClick={async () => {
					try {
						$settings.service_settings[service].available_languages = await this.plugin.translator.get_languages();
						new Notice('Language selection updated');
					} catch (e) {
						new Notice('Failed to fetch languages, check host or API key');
					}
				}}
			/>
		</SettingItem>

	{/if}
{/each}

<style lang="scss">
	.translator-title {
		justify-content: center;
	}

</style>
