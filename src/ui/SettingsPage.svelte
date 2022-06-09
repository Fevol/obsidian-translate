<script lang="ts">
	import {Notice} from "obsidian";
	import TranslatorPlugin from "../main";

	import type {Writable} from "svelte/store";
	import {Button, Dropdown, Toggle, Input, Icon, ToggleButton, ButtonList, SettingItem} from "./components";

	import type {PluginData, TranslatorPluginSettings} from "../types";
	import {TRANSLATION_SERVICES_INFO} from "../constants";

	import ISO6391 from "iso-639-1";
	import {toTitleCase} from "../util";


	// export let plugin: TranslatorPlugin;
	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;
	let selectable_services: any[];

	$: {
		$data.all_languages = new Map(plugin.locales.map((locale) => {
			if ($settings.display_language === 'local')
				return [locale, ISO6391.getNativeName(locale)]
			else if ($settings.display_language === 'display')
				return [locale, plugin.localised_names.of(locale)]
		}));
		$data.available_languages = $settings.use_spellchecker_languages ? $data.spellchecker_languages : $settings.selected_languages;
		if ($settings.filter_service_languages)
			$data.available_languages = $data.available_languages.filter((locale) => $settings.service_settings[$settings.translation_service].available_languages.contains(locale));

		selectable_services = Array.from($data.all_languages)
			.map(([locale, name]) => { return {'value': locale, 'text': name} })
			.filter((option) => { return !$settings.selected_languages.contains(option.value); })
			.sort((a, b) => { return a.text.localeCompare(b.text);});

		if ($settings.filter_service_languages)
			selectable_services = selectable_services.filter((option) => { return $settings.service_settings[$settings.translation_service].available_languages.contains(option.value); });
		selectable_services.unshift({'value': '', 'text': '+'});
	}


	// Set-up observers on service settings
	//   Observing service settings object itself, will cause a trigger to be fired for *any* key value change in the object (undesirable)
	let service_observer: any;
	let api_key_observer: any;
	let host_observer: any;
	let region_observer: any;

	$: $settings.translation_service,
		service_observer = $settings.translation_service,
		api_key_observer = $settings.service_settings[$settings.translation_service].api_key,
		host_observer = $settings.service_settings[$settings.translation_service].host,
		region_observer = $settings.service_settings[$settings.translation_service].region;

	$: api_key_observer, host_observer, region_observer,
		plugin.setupTranslationService(service_observer, api_key_observer, region_observer, host_observer)

</script>

<h3>General Settings</h3>
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
			disabled={$settings.use_spellchecker_languages}
			onClick={(locale) => {
				$settings.selected_languages = $settings.selected_languages.filter((l) => l !== locale);
			}}
		/>
		<Dropdown
			options={ selectable_services }
			value=""
			onChange={(e) => {
				$settings.selected_languages = [...$settings.selected_languages, e.target.value];
				e.target.value = "";
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Sync with spellchecker languages"
	description=""
	type="toggle"
>
	<Toggle
		slot="control"
		value={ $settings.use_spellchecker_languages }
		onChange={(val) => {
      		$settings.use_spellchecker_languages = val;
    	}
    }
	/>
</SettingItem>

<SettingItem
	name="Filter languages"
	description="Only display languages supported by the translation service"
	type="toggle"
>
	<Toggle
		slot="control"
		value={ $settings.filter_service_languages }
		onChange={(val) => {
      		$settings.filter_service_languages = val;
    	}
    }
	/>
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
			console.log($settings);
		}}
	>
	</Dropdown>

</SettingItem>

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


{#each Object.entries(services) as [service, info]}
	{#if service === $settings.translation_service}
		<h2 class="icon-text translator-title">
			<Icon icon={service} size=22 />
			{toTitleCase(service.replace('_', ' '))}
		</h2>


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

			{#if info.region_options !== null}
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
					let valid = await plugin.translator.validate();
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
