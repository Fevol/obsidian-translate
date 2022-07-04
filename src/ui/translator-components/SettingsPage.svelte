<script lang="ts">
	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";
	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";
	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from ".././components";
	import {SettingItem} from "../obsidian-components";
	import {PasswordModal, PasswordRequestModal} from "../modals";

	import type {
		DownloadableModel,
		PluginData,
		TranslatorPluginSettings,
		ValidationResult
	} from "../../types";
	import {TRANSLATION_SERVICES_INFO, SECURITY_MODES} from "../../constants";

	import {aesGcmDecrypt, aesGcmEncrypt, humanFileSize, toTitleCase} from "../../util";
	import {requestUrl, TFile} from "obsidian";
	import t from "../../l10n";

	// export let plugin: TranslatorPlugin;
	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;
	const security_options = SECURITY_MODES;
	let selectable_services: any[];
	let downloadable_models: any[];


	// Update list of languages that can be selected in 'Manually select languages' option
	$: {
		selectable_services = Array.from($data.all_languages)
			.map(([locale, name]) => { return {'value': locale, 'text': name} })
			.filter((option) => { return !$settings.service_settings[$settings.translation_service].selected_languages.contains(option.value); })
			.sort((a, b) => { return a.text.localeCompare(b.text);});
		selectable_services.unshift({'value': '', 'text': '+'});
	}

	$: {
		let models = $settings.service_settings[$settings.translation_service].downloadable_models;
		if (models) {
			downloadable_models = Array.from(models)
				.filter(model => {
					return !$settings.service_settings[$settings.translation_service].available_languages.some((other) => {
						return other.locale === model.locale;
					});
				})
				.map(model => {
					return {'value': model.locale, 'text': `${$data.all_languages.get(model.locale)} (${humanFileSize(model.size, true)})${model.development ? ' [DEV]' : ''}`};
				})
				.sort((a, b) => { return a.text.localeCompare(b.text);});
			downloadable_models.unshift({'value': '', 'text': '+'});
		}
	}

	async function setAPIKey(mode: string, service: string, key: string) {
		if (mode === "none") {
			$settings.service_settings[service].api_key = key;
		} else if (mode === "password") {
			$settings.service_settings[service].api_key = await aesGcmEncrypt(key, localStorage.getItem('password'));
		} else if (mode === "local_only") {
			localStorage.setItem(service + '_api_key', key);
		} else if (mode === "dont_save") {
			sessionStorage.setItem(service + '_api_key', key);
		}
	}

	function clearAPIKeys(old_mode: string, new_mode: string) {
		if ((old_mode === "none" || old_mode === "password") && !(new_mode === "none" || new_mode === "password")) {
			for (let service in $settings.service_settings)
				$settings.service_settings[service].api_key = undefined;
		} else if (old_mode === "local_only") {
			for (let service in $settings.service_settings)
				localStorage.removeItem(service + '_api_key');
		} else if (old_mode === "dont_save") {
			for (let service in $settings.service_settings)
				sessionStorage.removeItem(service + '_api_key');
		}
	}

	async function updateAPIKeys(old_mode: string, new_mode: string) {
		for (let service in $settings.service_settings) {
			let key: string;
			if (old_mode === "none") {
				key = $settings.service_settings[service].api_key;
			} else if (old_mode === "password") {
				key = await aesGcmDecrypt($settings.service_settings[service].api_key, localStorage.getItem('password'));
			} else if (old_mode === "local_only") {
				key = localStorage.getItem(service + '_api_key');
			} else if (old_mode === "dont_save") {
				key = sessionStorage.getItem(service + '_api_key');
			}
			await setAPIKey(new_mode, service, key || '');
		}
		clearAPIKeys(old_mode, new_mode);
	}

	function invalidateService() {
		$settings.service_settings[$settings.translation_service].validated = null;
		plugin.translator.valid = null;
	}


	async function writeOrReplace(path: string, data: ArrayBuffer) {
		// getAbstractFileByPath will not find the file if it is inside a hidden folder (e.g. obsidian);
		// it seems like createBinary does not care about hidden folders
		if (await app.vault.adapter.exists(path))
			await app.vault.adapter.writeBinary(path, data);
		else
			await app.vault.createBinary(path, data);
	}

	async function writeRecursive(path: string, data: any) {
		let paths = path.split('/').filter(x => x !== '');
		let current_path = '';
		for (let i = 0; i < paths.length - 1; i++) {
			current_path += paths[i];
			if (!await app.vault.adapter.exists(current_path))
				await app.vault.adapter.mkdir(current_path);
			current_path += '/';
		}
		await app.vault.adapter.writeBinary(path, data);
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

<SettingItem
	name="Security settings for API key"
	description="Determine how the API key is stored on the device"
	type="dropdown"
	notices={[
		{ type: 'text', text: `🛈 ${security_options.find(x => x.value === $settings.security_setting).info}`}
	]}
>
	<Dropdown
		slot="control"
		options={security_options}
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
		<div slot="control" style="display: flex; flex-direction: column; gap: 16px">
			<Button
				text="Set new password"
				onClick={() => {
					new PasswordModal(plugin.app, plugin).open()
				}}
			/>
			<Button
				text="Set password"
				onClick={() => {
					new PasswordRequestModal(plugin).open();
				}
			}
			/>
		</div>
	</SettingItem>
{/if}

{#each Object.entries(services) as [service, info]}
	{#if service === $settings.translation_service}
		<div in:horizontalSlide="{{duration: 600, delay: 300 }}" out:slide={{  duration: 400 }}>
			<h2 class="icon-text translator-title">
				<Icon icon={service} size=22 />
				{toTitleCase(service.replace('_', ' '))}
			</h2>

			{#if service === 'bergamot'}
				<SettingItem
					name="Model path"
					description="Determine where in the '.obsidian' folder the local models should be stored"
					type="input"
				>
					<Input
						slot="control"
						val={$settings.service_settings[$settings.translation_service].storage_path}
						onChange={(e) => {
							$settings.service_settings[$settings.translation_service].storage_path = e.target.value;
						}}
						type="text"
					/>
				</SettingItem>
				<SettingItem
					name="Setup local text detection"
					description="Install FastText language models for local text detection"
					type="button"
				>
					<!-- Download FastText model and binary -->
					<!-- FIXME: Official FastText repo does not contain wasm file, so the binary was added to the plugin's repo
					      users would probably prefer if the file was downloaded from an official place -- look for this! -->
					<!-- FIXME: Find a better way to reinitialize FastText -->

					<button
						slot="control"
						class:translator-success={plugin.translator?.valid}
						class:translator-fail={plugin.translator?.valid === false}
						class="icon-text"
						style="justify-content: center"
						on:click={async () => {
							let model_path = `.obsidian/${$settings.service_settings[service].storage_path}/lid.176.ftz`
							let model_result = await requestUrl({url: "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz"});
							await writeOrReplace(model_path, model_result.arrayBuffer);

							let binary_path = `.obsidian/${$settings.service_settings[service].storage_path}/fasttext_wasm.wasm`
							let binary_result = await requestUrl({url: "https://github.com/Fevol/obsidian-translate/blob/bergamot/models/fasttext_wasm.wasm?raw=true"});
							await writeOrReplace(binary_path, binary_result.arrayBuffer);

							plugin.message_queue("Successfully installed FastText data");

							plugin.reactivity.setupTranslationService();
						}}
					>
						<Icon icon={"download"} />
					</button>
				</SettingItem>

				<SettingItem name="Manage Bergamot models">
					<div slot="control">
						<ButtonList
							items={ $settings.service_settings[service].available_languages.map((model) => {
								return {
									'value': model.locale,
									'text': `${$data.all_languages.get(model.locale)} (${humanFileSize(model.size, true)})${model.development ? ' [DEV]' : ''}`
								}
							}) }
							icon="cross"
							onClick={async (e) => {

							}}
						/>
						<Dropdown
							options={ downloadable_models }
							value=""
							onChange={async (e) => {
								let model = $settings.service_settings[service].downloadable_models.find(x => x.locale === e.target.value);

								const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

								for (let file_info of model.files.from) {
									console.log(`${rootURL}/${$settings.service_settings[service].version}/${model.locale}en/${file_info.filename}`)
									let file = await requestUrl({url: `${rootURL}/${$settings.service_settings[service].version}/${model.locale}en/${file_info.filename}`});
									if (file.status !== 200) {
										plugin.message_queue(`Failed to download ${t(model.locale)} language models`);
										return;
									}
									await writeRecursive(`.obsidian/${$settings.service_settings[service].storage_path}/bergamot/${model.locale}/${file_info.filename}`, file.arrayBuffer);
								}

								for (let file_info of model.files.to) {
									let file = await requestUrl({url: `${rootURL}/${$settings.service_settings[service].version}/en${model.locale}/${file_info.filename}`});
									if (file.status !== 200) {
										plugin.message_queue(`Failed to download ${t(model.locale)} language models`);
										return;
									}
									await writeRecursive(`.obsidian/${$settings.service_settings[service].storage_path}/bergamot/${model.locale}/${file_info.filename}`, file.arrayBuffer);
								}

								plugin.message_queue(`Successfully installed ${t(model.locale)} language models`);

								$settings.service_settings[service].available_languages = [...$settings.service_settings[service].available_languages, model];

							}}
						/>
					</div>
				</SettingItem>


			{/if}

			{#if $settings.service_settings[$settings.translation_service].filter_type !== 0}
				<SettingItem
					name="Translator languages"
					description="Choose languages to include in translator selection"
				>
					<div slot="control" transition:slide>
						<ButtonList
							items={Array.from($data.available_languages)
								.map((locale) => {return {'value': locale, 'text': $data.all_languages.get(locale)};})
								.sort((a, b) => a.text.localeCompare(b.text))
							}
							icon="cross"
							disabled={$settings.service_settings[$settings.translation_service].filter_type === 1}
							onClick={(locale) => {
								$settings.service_settings[$settings.translation_service].selected_languages =
									$settings.service_settings[$settings.translation_service].selected_languages.filter((l) => l !== locale);
							}}
						/>
						{#if $settings.service_settings[$settings.translation_service].filter_type !== 1}
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
						{/if}
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


			{#if info.request_key !== undefined}
				<SettingItem
					name="API Key"
					description="API key for translation service"
					type="text"
					notices={[
						{ type: 'href', text: "🛈 Sign up for API key here", url: info.request_key},
						...($data.api_key?.endsWith("==") ? [{ type: 'text', text: `⚠ API key is still encrypted`, style: 'warning-text'}] : [])
					]}
				>
					<Input
						slot="control"
						val={$data.api_key}
						onChange={(e) => {
							setAPIKey($settings.security_setting, service, e.target.value);
							$data.api_key = e.target.value;
							invalidateService();
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
					{ type: 'href', text: "🛈 You can host this service locally", url: info.local_host}
				]}
				>
					<Input
						slot="control"
						val={$settings.service_settings[service].host}
						onChange={(e) => {
							$settings.service_settings[service].host = e.target.value;
							invalidateService();
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
				<!-- FIXME: Check if there is a way to merge the setting's writeable and the translation service's writeable, currently implementation is ugly-->
				<ToggleButton
					text="Test"
					slot="control"
					value={$settings.service_settings[service].validated}
					fn={async () => {
						let validation_results = await plugin.translator.validate();
						plugin.translator.valid = validation_results.valid;
						if (validation_results.message)
							plugin.message_queue(validation_results.message, !validation_results.valid ? 5000 : 3000);
						if (validation_results.host)
							$settings.service_settings[service].host = validation_results.host;
						$settings.service_settings[service].validated = validation_results.valid;
						return validation_results.valid;
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

			{#if $settings.service_settings[service].auto_translate}
				<SettingItem
					name="Translation delay"
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
						value={$settings.service_settings[$settings.translation_service].auto_translate_interval}
						aria-label={$settings.service_settings[$settings.translation_service].auto_translate_interval ?
								$settings.service_settings[$settings.translation_service].auto_translate_interval + "ms" :
								"Instant"
								}
						on:change={(e) => {
						$settings.service_settings[service].auto_translate_interval = parseInt(e.target.value);
					}}
					/>
				</SettingItem>
			{/if}


			<SettingItem
				name="Update Languages"
				description="Update the list of available languages"
			>
				<Button
					slot="control"
					icon="switch"
					onClick={async () => {
						let return_values = await plugin.translator.get_languages();
						if (return_values.message)
							plugin.message_queue(return_values.message);
						if (return_values.languages) {
							if (return_values.data) {
								$settings.service_settings[service].downloadable_models = return_values.languages;
								$settings.service_settings[service].version = return_values.data;
								plugin.reactivity.updateLanguageNames();
							} else {
								$settings.service_settings[service].available_languages = return_values.languages;
							}
							plugin.message_queue("Languages updated");
						}
					}}
				/>
			</SettingItem>
		</div>
	{/if}
{/each}

<style lang="scss">
	.translator-title {
		justify-content: center;
	}


</style>
