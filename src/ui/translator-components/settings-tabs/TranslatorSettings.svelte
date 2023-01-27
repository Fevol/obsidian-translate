<script lang="ts">
	import TranslatorPlugin from "../../../main";


	import {settings, bergamot_data, all_languages, available_languages, spellcheck_languages} from "../../../stores";
	import {slide} from "svelte/transition";

	import {Button, Dropdown, Toggle, Input, Icon, ToggleButton, ButtonList} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	import {ConfirmationModal} from "../../modals";

	import {SERVICES_INFO, UNTESTED_SERVICES} from "../../../constants";
	import {DummyTranslate} from "../../../handlers";

	import {Notice, requestUrl, Platform} from "obsidian";
	import {humanFileSize} from "../../../util";
	import {openGithubIssueLink, writeRecursive} from "../../../obsidian-util";

	import t from "../../../l10n";


	export let plugin: TranslatorPlugin;
	export let service: string;
	$: service, changedService();

	let translator: DummyTranslate;
	let old_service = '';
	
	let current_available_languages: string[] = [];
	let selectable_languages: any[];

	let filtered_languages: any[];
	let downloadable_models: any[];

	let bergamot_update_available = $bergamot_data.models && $bergamot_data.version < $settings.service_settings.bergamot.version;
	let api_key = null;
	let info: any = {};

	let obfuscate_api_key = app.loadLocalStorage("obfuscate_keys") || false;

	async function changedService() {
		// Set translator to the selected service
		translator = await plugin.reactivity.getTranslationService(service, old_service);

		info = SERVICES_INFO[service];
		if (info?.requires_api_key)
			api_key = await plugin.reactivity.getAPIKey(service, $settings.security_setting);

		current_available_languages = translator.available_languages || $settings.service_settings[service].available_languages;
		
		old_service = service;
	}

	async function updateBergamot() {
		let updatable_models = $settings.service_settings.bergamot.downloadable_models.filter(model => {
			const other = $bergamot_data.models.find(x => x.locale === model.locale);
			return other && model.size !== other.size;
		})

		/*  TODO: To my knowledge, it is not possible to check the filesize of a file on Github without downloading it
		          but the wasm could change between versions of Bergamot, with older models being incompatible with the newer binary
		          or vice versa; plus new features could be introduced (such as support for mobile platforms).
		          So to be safe, we will always download the latest version of Bergamot when an update is available. */
		let binary_path = `${app.vault.configDir}/plugins/translate/models/bergamot/bergamot-translator-worker.wasm`
		let binary_result = await requestUrl({url: "https://github.com/mozilla/firefox-translations/blob/main/extension/model/static/translation/bergamot-translator-worker.wasm?raw=true"});
		await writeRecursive(binary_path, binary_result.arrayBuffer);



		const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

		let current_models = $bergamot_data.models;

		for (let model of updatable_models) {
			for (let modelfile of model.files) {
				const path = `${app.vault.configDir}/plugins/translate/models/bergamot/${model.locale}/${modelfile.name}`;
				const stats = await app.vault.adapter.stat(path);
				// If file does not exist (new file of model), or filesizes differ (updated file of model), download new version
				if (!stats || stats.size !== modelfile.size) {
					const file = await requestUrl({url: `${rootURL}/${$settings.service_settings.bergamot.version}/${modelfile.usage === 'from' ? `${model.locale}en` : `en${model.locale}`}/${modelfile.name}`});
					if (file.status !== 200) {
						plugin.message_queue(`Failed to update ${t(model.locale)} language model, aborting update`);
						return;
					}
					await app.vault.adapter.writeBinary(path, file.arrayBuffer);
				}
			}
			const model_index = current_models.findIndex(x => x.locale === model.locale);

			// Remove files that are no longer included in the model
			let to_remove = current_models[model_index].files.filter(x => !model.files.find(y => y.name === x.name));
			for (let file of to_remove)
				await app.vault.adapter.remove(`${app.vault.configDir}/plugins/translate/models/bergamot/${model.locale}/${file.name}`);

			current_models[model_index] = model;
		}
		$bergamot_data = {
			binary: $bergamot_data.binary,
			version: $settings.service_settings.bergamot.version,
			models: current_models
		}
		bergamot_update_available = false;
		plugin.message_queue(`Bergamot language models updated successfully`);
	}

	function invalidateService() {
		$settings.service_settings[service].validated = null;
		translator.valid = null;
	}


	// Update list of languages that can be selected in 'Manually select languages' option
	$: filterLanguages(current_available_languages);


	function filterLanguages(languages: any[]) {
		if (service in SERVICES_INFO && SERVICES_INFO[service].type === 'translation') {
			selectable_languages = languages
				.filter(locale => { return !$settings.service_settings[service].selected_languages.includes(locale); })
				.map(locale => { return {'value': locale, 'text': $all_languages.get(locale) || locale } })
				.sort((a, b) => { return a.text.localeCompare(b.text);});
			selectable_languages.unshift({'value': '', 'text': '+'});

			filtered_languages = $settings.service_settings[service].selected_languages
				.filter(locale => languages.includes(locale))
				.map(locale => {return {'value': locale, 'text': $all_languages.get(<string>locale) || locale}})
				.sort((a, b) => a.text.localeCompare(b.text));

			if (service === $settings.translation_service) {
				if ($settings.filter_mode === '0')
					$available_languages = languages;
				else if ($settings.filter_mode === '1')
					$available_languages = languages.filter(locale => { return $spellcheck_languages.includes(locale); });
				else if ($settings.filter_mode === '2')
					$available_languages = languages.filter(locale => { return $settings.service_settings[service].selected_languages.includes(locale); });
			}
		}
	}

	$: {
		if (service === 'bergamot' && $bergamot_data) {
			let models = $settings.service_settings[service].downloadable_models;
			if (models) {
				downloadable_models = Array.from(models)
					.filter(model => {
						return !$bergamot_data.models?.some((other) => {
							return other.locale === model.locale;
						});
					})
					.map(model => {
						return {'value': model.locale, 'text': `${$all_languages.get(model.locale)} (${humanFileSize(model.size, false)})${model.dev ? ' [DEV]' : ''}`};
					})
					.sort((a, b) => { return a.text.localeCompare(b.text);});
				downloadable_models.unshift({'value': '', 'text': '+'});
			}
		}
	}


</script>

<!-- Show warning when service is untested -->
{#if UNTESTED_SERVICES.includes(service)}
	<div class="translator-warning-message">
		<Icon icon="alert-triangle" size={50}/>
		<div>
			<b>WARNING:</b> {info.display_name} has not been tested, so it is very likely that it does not work properly.<br><br>
			If you encounter any issue, please open an issue over on
				<a on:click={() => {openGithubIssueLink(info.display_name, {})}}>GitHub</a>,
			I will try to fix it as soon as possible.<br>
			Likewise, if the service works properly, let me know!
		</div>
	</div>
{/if}


{#if service === 'bergamot'}
	<SettingItem
		name="Service set-up"
		type="heading"
	/>

	<SettingItem
		name="Setup local translation"
		description="Install Bergamot translation engine (size: 5.05MiB)"
		type="button"
		notices={translator?.has_autodetect_capability() ? [] : [
			{ type: 'text', text: `Automatic language detection is <b>disabled</b>, install FastText to enable this feature`, style: 'translator-info-text' }
		]}
	>
		<div slot="control" class="setting-item-control">
			<!-- FIXME: WASM location in repo might not be very stable (but would be most up-to-date) -->
			<button
				aria-label={bergamot_update_available ? "Bergamot update available": "Install"}
				class:translator-extra={bergamot_update_available}
				class:translator-success={!bergamot_update_available && $bergamot_data.binary}
				class="translator-icon-text"
				style="justify-content: center; flex: 1;"
				on:click={async () => {
					if (bergamot_update_available) {
						await updateBergamot();
						translator.update_data($bergamot_data);
					} else {
						let binary_path = `${app.vault.configDir}/plugins/translate/models/bergamot/bergamot-translator-worker.wasm`
						let binary_result = await requestUrl({url: "https://github.com/mozilla/firefox-translations/blob/main/extension/model/static/translation/bergamot-translator-worker.wasm?raw=true"});
						await writeRecursive(binary_path, binary_result.arrayBuffer);

						if (!$bergamot_data.models)
							$bergamot_data = {binary: {}, models: [], version: $settings.service_settings.bergamot.version};

						$bergamot_data.binary = {
							name: 'bergamot-translator-worker.wasm',
							size: binary_result.arrayBuffer.byteLength,
						}

						translator.setup_service($bergamot_data);

						plugin.message_queue("Successfully installed Bergamot binary");
					}
				}}
			>
				<Icon icon={bergamot_update_available ? "refresh-cw" : "download"} />
			</button>

			{#if $bergamot_data.binary}
				<button
					transition:slide
					on:click={async (e) => {
						new ConfirmationModal(
							plugin,
							"Confirm uninstallation of Bergamot",
							"Are you sure you want to uninstall Bergamot?<br><div class='translator-warning-text'>This will also remove all local models you've installed.</div>",
							async () => {
								if (await app.vault.adapter.exists(`${app.vault.configDir}/plugins/translate/models/bergamot`))
									await app.vault.adapter.rmdir(`${app.vault.configDir}/plugins/translate/models/bergamot`, true);
								$bergamot_data = {binary: undefined, models: undefined, version: undefined};
								$settings.service_settings[service].validated = null;
								plugin.message_queue("Successfully uninstalled Bergamot and its language models");
								translator.valid = false;
								current_available_languages = [];
							},
						).open();
					}}>
					Uninstall
				</button>
			{/if}
		</div>
	</SettingItem>

	{#if $bergamot_data.binary }
		<SettingItem name="Manage Bergamot models" 	class="translator-setting-subsetting">
			<div slot="control" class="setting-item-control">
				<!-- TODO: Removal should consider whether model was already removed via FS  -->
				<ButtonList
					items={ $bergamot_data?.models.map((model) => {
						return {
							'value': model.locale,
							'text': `${$all_languages.get(model.locale)} (${humanFileSize(model.size, false)})${model.dev ? ' [DEV]' : ''}`
						}
					}) }
					icon="cross"
					tooltip="Uninstall"
					onClick={async (e) => {
						const model = $bergamot_data.models.find(x => x.locale === e);

						const model_dir = `${app.vault.configDir}/plugins/translate/models/bergamot/${model.locale}/`;
						if (await app.vault.adapter.exists(model_dir))
							await app.vault.adapter.rmdir(model_dir, true);

						const model_idx = $bergamot_data.models.findIndex(x => x.locale === model.locale);

						$bergamot_data.models.splice(model_idx, 1);
						translator.update_data($bergamot_data);

						// Trigger reactivity
						$bergamot_data.models = $bergamot_data.models;
						current_available_languages = translator.available_languages;

						plugin.message_queue(`Successfully removed ${t(model.locale)} language model`);
					}}
				/>
				<Dropdown
					options={ downloadable_models }
					value=""
					onChange={async (e) => {
						if (e.target.value) {
							const model = $settings.service_settings[service].downloadable_models.find(x => x.locale === e.target.value);
							const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

							// If there are already models installed, use the same Bergamot version as all other models,
							// otherwise use the most up-to-date version (given in data.json)
							const version = $bergamot_data.models ? $bergamot_data.version : $settings.service_settings.bergamot.version;

							// Connection speed in Bps
							let avg_download_speed = navigator.connection.downlink * 1000000;
							let total_size = model.files.reduce((acc, cur) => acc + cur.size, 0);
							const progress_bar_length = 10;
							let progress_bar = new Notice(`Downloading ${model.files.length} files\nProgress:\t\t   [${' '.repeat(progress_bar_length)}]\nRemaining time: ???s`, 0)

							try {
								// Sort files of model by size, descending
								// Larger files have a higher download speed, which will offer a better upper limit on the remaining time
								for (const [index, modelfile] of model.files.sort((a, b) => { return b.size - a.size; }).entries()) {
									const start_time = Date.now();
									const path = `${app.vault.configDir}/plugins/translate/models/bergamot/${model.locale}/${modelfile.name}`;
									const stats = await app.vault.adapter.stat(path);
									if (stats && stats.size === modelfile.size)
										continue;
									const file = await requestUrl({url: `${rootURL}/${version}/${modelfile.usage === 'from' ? `${model.locale}en` : `en${model.locale}`}/${modelfile.name}`});


									let execution_time = (Date.now() - start_time) / 1000;

									if (!index)
										avg_download_speed = modelfile.size / execution_time
									else
										avg_download_speed = (avg_download_speed * index / (index + 1)) + ((modelfile.size / execution_time) / (index + 1));

									if (file.status !== 200) {
										progress_bar.hide();
										plugin.message_queue(`Failed to download ${t(model.locale)} language model`);
										return;
									}
									await writeRecursive(path, file.arrayBuffer);

									if (progress_bar.noticeEl.isConnected) {
										const progress = Math.round((index / model.files.length) * progress_bar_length);
										// Remaining time is multiplied by 1.2 to account for FS overhead
										const remaining_time = ((total_size / avg_download_speed) * 1.2).toFixed(2);
										total_size -= modelfile.size;
										progress_bar.setMessage(`Downloading ${model.files.length} files\nProgress:\t\t   [${'█'.repeat(progress)+' '.repeat(progress_bar_length - progress)}]\nRemaining time: ${remaining_time}s [${humanFileSize(avg_download_speed, true)+'/s'}]`);
									}
								}

								const model_idx = $bergamot_data.models.findIndex(x => x.locale === model.locale);
								if (model_idx !== -1)
									$bergamot_data.models.splice(model_idx, 1);

								$bergamot_data.models = [...$bergamot_data.models, model];
								translator.update_data($bergamot_data);
								current_available_languages = translator.available_languages;

								if (progress_bar.noticeEl.isConnected) {
									progress_bar.setMessage(`Successfully installed ${t(model.locale)} model\nProgress:\t\t   [${'█'.repeat(progress_bar_length)}]\nRemaining time: Finished!`);
									// Hide progress bar after 4 seconds
									setTimeout(() => progress_bar.hide(), 4000);
								} else {
									plugin.message_queue(`Successfully installed ${t(model.locale)} model`, 4000);
								}
							} catch (e) {
								console.log("Installing language model failed: ", e);
								if (progress_bar.noticeEl.isConnected) {
									progress_bar.setMessage(`Installation of ${t(model.locale)} model failed\nProgress:\t\t   [${'↯'.repeat(progress_bar_length)}]\nRemaining time:\t\t   Failed!\n$Reason: ${e.message}`);
								} else {
									plugin.message_queue(`Installation of ${t(model.locale)} model failed\nReason: ${e.message}`, 0);
								}
							}
						}
					}}
				/>
			</div>
		</SettingItem>
	{/if}

{/if}

<SettingItem
	name="General settings"
	type="heading"
/>

{#if info.request_key !== undefined}
	<SettingItem
		name="API Key"
		description="API key for translation service"
		type="text"
		notices={[
			{ type: 'href', text: "ⓘ Sign up for an API key here", url: info.request_key},
			...(api_key?.endsWith("==") ? [{ type: 'text', text: `API key is still encrypted`, style: 'translator-error-text'}] : [])
		]}
	>
		<Input
			slot="control"
			class={obfuscate_api_key ? 'obfuscate-text' : ''}
			val={api_key}
			onChange={(e) => {
				api_key = e.target.value;
				translator.update_settings({api_key: e.target.value});

				plugin.reactivity.setAPIKey(service, $settings.security_setting, e.target.value);
				invalidateService();
			}}
			type="text"
		/>
		<!--class="obfuscate-text"-->
	</SettingItem>

	{#if info.requires_app_id}
		<SettingItem
			name="App ID"
			description="ID used for translation service"
			type="text"
		>
			<Input
				slot="control"
				val={$settings.service_settings[service].app_id}
				class={obfuscate_api_key ? 'obfuscate-text' : ''}
				onChange={(e) => {
					$settings.service_settings[service].app_id = e.target.value;
					translator.update_settings({app_id: e.target.value});

					invalidateService();
				}}
				type="text"
			/>
		</SettingItem>
	{/if}

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
					translator.update_settings({region: e.target.value});

					invalidateService();
				}}
			/>
		</SettingItem>
	{/if}
{/if}

{#if info.host !== undefined}
	<SettingItem
		name="Host"
		description="Enter the URL of the translation service"
		type="text"
		notices={[
			{ type: 'href', text: "ⓘ You can host this service locally", url: info.local_host}
		]}
	>
		<div slot="control">
			{#if info.host_options}
				<Dropdown
					options={info.host_options}
					value={$settings.service_settings[service].host}
					onChange={(e) => {
						$settings.service_settings[service].host = e.target.value;
						translator.update_settings({host: e.target.value});

						invalidateService();
					}}
				/>
			{:else}
				<Input
					val={$settings.service_settings[service].host}
					onChange={(e) => {
						$settings.service_settings[service].host = e.target.value;
						translator.update_settings({host: e.target.value});

						invalidateService();
					}}
					type="text"
				/>
			{/if}
		</div>
	</SettingItem>
{/if}

{#if service !== 'bergamot'}
	<SettingItem
		name="Validate"
		description="Ensure that the translation service is set-up properly"
		type="button"
	>
		<ToggleButton
			text="Test"
			slot="control"
			value={$settings.service_settings[service].validated}
			fn={async () => {
				let validation_results = await translator.validate();
				if (validation_results.message)
					plugin.message_queue(validation_results.message, !validation_results.valid ? 5000 : 3000);
				if (validation_results.host)
					$settings.service_settings[service].host = validation_results.host;
				$settings.service_settings[service].validated = validation_results.valid;
				return validation_results.valid;
			}}
		/>
	</SettingItem>
{/if}

<SettingItem
	name="Automatic translate"
	description="Translate text as it is being typed"
	type="toggle"
	notices={
		service === 'bergamot' ? [] :
		[{text: "May result in the character quota of the service being spent more quickly", style: 'translator-warning-text'}]
	}
>
	<Toggle
		slot="control"
		value={ $settings.service_settings[service].auto_translate }
		onChange={(val) => {
			$settings.service_settings[service].auto_translate = val;
		}}
	/>
</SettingItem>

{#if $settings.service_settings[service].auto_translate}
	<SettingItem
		name="Translation delay"
		class="translator-setting-subsetting"
		description="How long after the user stops typing should the translation be performed (in milliseconds)"
		type="slider"
	>
		<input
			slot="control"
			type="range"
			class="slider"

			min={0}
			max={2000}
			step={100}
			value={$settings.service_settings[service].auto_translate_interval}
			aria-label={$settings.service_settings[service].auto_translate_interval ?
						$settings.service_settings[service].auto_translate_interval + "ms" :
						"Instant"
			}
			on:change={(e) => {
				$settings.service_settings[service].auto_translate_interval = parseInt(e.target.value);
			}}
		/>
	</SettingItem>
{/if}


<SettingItem
	name="Language selection"
	description="Languages available when using the 'Selection Mode' filter"
>
	<div slot="control" transition:slide class="setting-item-control">
		<ButtonList
			items={ filtered_languages }
			icon="cross"
			onClick={(locale) => {
				$settings.service_settings[service].selected_languages =
					$settings.service_settings[service].selected_languages.filter((l) => l !== locale);
				filterLanguages(current_available_languages);
			}}
		/>
		<Dropdown
			options={ selectable_languages }
			value=""
			onChange={(e) => {
				$settings.service_settings[service].selected_languages =
				 [...$settings.service_settings[service].selected_languages, e.target.value];
				filterLanguages(current_available_languages);
				e.target.value = "";
			}}
		/>
	</div>
</SettingItem>

<SettingItem
	name="Update Languages"
	description="Update the list of available languages"
>
	<Button
		slot="control"
		icon="switch"
		tooltip="Update languages"
		onClick={async () => {
			let return_values = await translator.languages();
			if (return_values.message)
				plugin.message_queue(return_values.message);
			if (return_values.languages) {
				if (return_values.data) {
					if (return_values.data > $bergamot_data?.version)
						bergamot_update_available = true;
					$settings.service_settings[service].downloadable_models = return_values.languages;
					$settings.service_settings[service].version = return_values.data;
				} else {
					$settings.service_settings[service].available_languages = return_values.languages;
				}
				plugin.message_queue("Languages updated");
			}
		}}
	/>
</SettingItem>

{#if info.online_glossary}
	<SettingItem
		name="Update Glossary Languages"
		description="Update the list of languages that can be used for the server-side glossary"
	>
		<Button
			slot="control"
			icon="switch"
			tooltip="Update languages"
			onClick={async () => {
				const output = await translator.glossary_languages();
				if (output.message)
					plugin.message_queue(output.message);
				if (output.languages) {
					$settings.service_settings[service].glossary_languages = output.languages;
					plugin.message_queue("Glossary languages updated");
				}
			}}
		/>
	</SettingItem>
{/if}

{#if info.options}
<SettingItem
	name="Service-specific options"
	type="heading"
/>

	{#if info.options.split_sentences}
		<SettingItem
			name="Split sentences"
			description="Determine if sentences should be split into separate lines"
			type="dropdown"
		>
			<Dropdown
				slot="control"
				value={ $settings.service_settings[service].split_sentences ?? "none" }
				options={[
					{value: "none", text: "Do not split sentences"},
					{value: "punctuation", text: "Split sentences on punctuation"},
					{value: "newline", text: "Split sentences on newlines"},
					{value: "both", text: "Split sentences on both"}
				]}
				onChange={(e) => {
					$settings.service_settings[service].split_sentences = e.target.value;
					translator.options.split_sentences = e.target.value;
				}}
			/>
		</SettingItem>
	{/if}

	{#if info.options.preserve_formatting}
		<SettingItem
			name="Preserve formatting"
			description="Do not change the formatting of the source text"
			type="toggle"
		>
			<Toggle
				slot="control"
				value={ $settings.service_settings[service].preserve_formatting }
				onChange={(val) => {
					$settings.service_settings[service].preserve_formatting = val;
					translator.options.preserve_formatting = val;
				}}
			/>
		</SettingItem>
	{/if}

	{#if info.options.formality}
		<SettingItem
			name="Formality"
			description="How formal should the translation be"
			type="dropdown"
			notices={[
				{type: "info", text: "Not all languages support formality", style: "translator-info-text"}
			]}
		>
			<Dropdown
				slot="control"
				value={ $settings.service_settings[service].formality ?? "default" }
				options={[
					{value: "default", text: "Default"},
					{value: "formal", text: "More formal"},
					{value: "informal", text: "Less formal"}
				]}
				onChange={(e) => {
					$settings.service_settings[service].formality = e.target.value;
					translator.options.formality = e.target.value;
				}}
			/>
		</SettingItem>
	{/if}

	{#if info.options.profanity_filter}
		<SettingItem
			name="Profanity filter"
			description="If profanity should be filtered out of the translation"
			type="dropdown"
		>
			<Dropdown
				slot="control"
				value={ $settings.service_settings[service].profanity_filter?.action ?? "none" }
				options={[
					{value: "none", text: "Do not filter profanity"},
					{value: "mark", text: "Mask profanity with marker"},
					{value: "delete", text: "Remove profanity"}
				]}
				onChange={(val) => {
					let profanity = $settings.service_settings[service].profanity_filter ?? {};
					profanity.action = val.target.value;
					$settings.service_settings[service].profanity_filter = profanity;
					translator.options.profanity_filter = profanity;
				}}
			/>
		</SettingItem>

		{#if $settings.service_settings[service].profanity_filter?.action === "mark"}
			<SettingItem
				name="Profanity marker"
				description="The type of marker to use when masking profanity"
				type="dropdown"
				class="translator-setting-subsetting"
			>
				<Dropdown
					slot="control"
					value={ $settings.service_settings[service].profanity_filter?.marker ?? "mask" }
					options={[
						{value: "mask", text: "Mask"},
						{value: "html-tag", text: "HTML tag"},
					]}
					onChange={(val) => {
						$settings.service_settings[service].profanity_filter.marker = val.target.value;
						translator.options.profanity_filter.marker = val.target.value;
					}}
				/>
			</SettingItem>
		{/if}
	{/if}
{/if}
