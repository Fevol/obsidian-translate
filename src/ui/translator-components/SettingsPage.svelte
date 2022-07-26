<script lang="ts">
	import TranslatorPlugin from "../../main";

	import type {Writable} from "svelte/store";
	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";
	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from ".././components";
	import {SettingItem} from "../obsidian-components";
	import {ConfirmationModal, PasswordModal, PasswordRequestModal} from "../modals";

	import type {
		PluginData,
		TranslatorPluginSettings,
	} from "../../types";
	import {TRANSLATION_SERVICES_INFO, SECURITY_MODES, DEFAULT_SETTINGS} from "../../constants";

	import {aesGcmDecrypt, aesGcmEncrypt, humanFileSize, randn_bm, toTitleCase} from "../../util";
	import {Notice, requestUrl} from "obsidian";
	import t from "../../l10n";
	import {onMount} from "svelte";

	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	const services = TRANSLATION_SERVICES_INFO;
	const security_options = SECURITY_MODES;
	let selectable_services: any[];
	let downloadable_models: any[];


	let bergamot_update_available = false;

	// Update list of languages that can be selected in 'Manually select languages' option
	$: {
		selectable_services = $data.available_languages
			.map(locale => { return {'value': locale, 'text': $data.all_languages.get(locale) } })
			.filter((option) => { return !$settings.service_settings[$settings.translation_service].selected_languages.contains(option.value); })
			.sort((a, b) => { return a.text.localeCompare(b.text);});
		selectable_services.unshift({'value': '', 'text': '+'});
		$data.has_autodetect_capability = plugin.translator?.has_autodetect_capability() === true;
	}

	$: {
		let models = $settings.service_settings[$settings.translation_service].downloadable_models;
		if (models) {
			downloadable_models = Array.from(models)
				.filter(model => {
					return !$data.models.bergamot?.models.some((other) => {
						return other.locale === model.locale;
					});
				})
				.map(model => {
					return {'value': model.locale, 'text': `${$data.all_languages.get(model.locale)} (${humanFileSize(model.size, false)})${model.development ? ' [DEV]' : ''}`};
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


	async function updateBergamot() {
		let updatable_models = $settings.service_settings.bergamot.downloadable_models.filter(model => {
			const other = $data.models.bergamot.models.find(x => x.locale === model.locale);
			return other && model.size !== other.size;
		})

		// TODO: To my knowledge, it is not possible to check the filesize of a file on Github without downloading it
		//  but the wasm could change between versions of Bergamot, with older models being incompatible with the newer binary
		//  or vice versa; plus new features could be introduced (such as support for mobile platforms).
		//  So to be safe, we will always download the latest version of Bergamot when an update is available.
		let binary_path = `.obsidian/${$settings.storage_path}/bergamot/bergamot-translator-worker.wasm`
		let binary_result = await requestUrl({url: "https://github.com/mozilla/firefox-translations/blob/main/extension/model/static/translation/bergamot-translator-worker.wasm?raw=true"});
		await writeRecursive(binary_path, binary_result.arrayBuffer);



		const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

		let current_models = $data.models.bergamot.models;

		for (let model of updatable_models) {
			for (let modelfile of model.files) {
				const path = `.obsidian/${$settings.storage_path}/bergamot/${model.locale}/${modelfile.name}`;
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
				await app.vault.adapter.remove(`.obsidian/${$settings.storage_path}/bergamot/${model.locale}/${file.name}`);

			current_models[model_index] = model;
		}
		$data.models.bergamot.models = current_models;
		$data.models.bergamot.version = $settings.service_settings.bergamot.version;
		bergamot_update_available = false;
		plugin.message_queue(`Bergamot language models updated successfully`);
	}

	onMount(() => {
		if ($settings.translation_service === 'bergamot' && $data.models?.bergamot?.models) {
			// Iff the version number is larger than both the currently installed version, and the most up-to-date data
			// 	(stored in data.json), update the downloadable data.
			if ( $data.models.bergamot.version < DEFAULT_SETTINGS.service_settings.bergamot.version &&
				 $settings.service_settings.bergamot.version < DEFAULT_SETTINGS.service_settings.bergamot.version) {
				$settings.service_settings.bergamot.version = DEFAULT_SETTINGS.service_settings.bergamot.version;
				$settings.service_settings.bergamot.downloadable_models = DEFAULT_SETTINGS.service_settings.bergamot.downloadable_models;
			}
			bergamot_update_available = $data.models.bergamot.version < $settings.service_settings.bergamot.version;
		}
	});

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
			// If translation service data does not exist in settings, add it
			if (!$settings.service_settings[e.target.value])
				$settings.service_settings[e.target.value] = DEFAULT_SETTINGS.service_settings[e.target.value];
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
		options={[{"value": "display", "text": "Display"}, {"value": "local", "text": "Native"}]}
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
		{ type: 'text', text: `🛈 ${security_options.find(x => x.value === $settings.security_setting).info}`, style: 'info-text' }
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
			if (plugin.translator.valid && $settings.translation_service === 'bergamot')
				plugin.translator.update_data(null, path);
		}}
		type="text"
	/>
</SettingItem>


{#each Object.entries(services) as [service, info]}
	{#if service === $settings.translation_service}
		<div in:horizontalSlide="{{duration: 600, delay: 300 }}" out:slide={{  duration: 400 }}>
			<h2 class="icon-text translator-title">
				<Icon icon={service} size="22" />
				{toTitleCase(service.replace('_', ' '))}
			</h2>

			{#if service === 'bergamot'}
				<SettingItem
					name="Setup local translation"
					description="Install Bergamot translation engine (size: 5.05MiB)"
					type="button"
				>
					<div slot="control">
						<!-- FIXME: WASM location in repo might not be very stable (but would be most up-to-date) -->
						<button
							aria-label={bergamot_update_available ? "Bergamot update available": "Install"}
							class:translator-extra={bergamot_update_available}
							class:translator-success={!bergamot_update_available && $data.models?.bergamot}
							class="icon-text"
							style="justify-content: center; flex: 1;"
							on:click={async () => {
								if (bergamot_update_available) {
									await updateBergamot();
									plugin.reactivity.updateAvailableLanguages();
									plugin.translator.update_data($data.models.bergamot);
								} else {
									let binary_path = `.obsidian/${$settings.storage_path}/bergamot/bergamot-translator-worker.wasm`
									let binary_result = await requestUrl({url: "https://github.com/mozilla/firefox-translations/blob/main/extension/model/static/translation/bergamot-translator-worker.wasm?raw=true"});
									await writeRecursive(binary_path, binary_result.arrayBuffer);

									if (!$data.models.bergamot)
										$data.models.bergamot = {binary: {}, models: [], version: $settings.service_settings.bergamot.version};

									$data.models.bergamot.binary = {
										name: 'bergamot-translator-worker.wasm',
										size: binary_result.arrayBuffer.byteLength,
									}

									$settings.service_settings[$settings.translation_service].validated = true;
									plugin.reactivity.setupTranslationService();
									plugin.message_queue("Successfully installed Bergamot binary");
								}
							}}
						>
							<Icon icon={bergamot_update_available ? "refresh-cw" : "download"} />
						</button>

						{#if $data.models?.bergamot}
							<button
								transition:slide
								on:click={async (e) => {
									new ConfirmationModal(
										plugin,
										"Confirm uninstallation of Bergamot",
										"Are you sure you want to uninstall Bergamot?<br><div class='warning-text'>⚠ This will also remove all local models you've installed.</div>",
										async () => {
											if (await app.vault.adapter.exists(`.obsidian/${$settings.storage_path}/bergamot`))
												await app.vault.adapter.rmdir(`.obsidian/${$settings.storage_path}/bergamot`, true);
											$data.models.bergamot = undefined;
											$settings.service_settings[$settings.translation_service].validated = null;
											plugin.message_queue("Successfully uninstalled Bergamot and its language models");
										},
									).open();
							}}>
								Uninstall
							</button>
						{/if}
					</div>
				</SettingItem>

				{#if $data.models.bergamot}
					<SettingItem name="Manage Bergamot models">
					<div slot="control">
						<!-- TODO: Removal should consider whether model was already removed via FS  -->
						<ButtonList
							items={ $data.models.bergamot?.models.map((model) => {
								return {
									'value': model.locale,
									'text': `${$data.all_languages.get(model.locale)} (${humanFileSize(model.size, false)})${model.development ? ' [DEV]' : ''}`
								}
							}) }
							icon="cross"
							tooltip="Uninstall"
							onClick={async (e) => {
								const model = $data.models.bergamot.models.find(x => x.locale === e);

								const model_dir = `.obsidian/${$settings.storage_path}/bergamot/${model.locale}/`;
								if (await app.vault.adapter.exists(model_dir))
									await app.vault.adapter.rmdir(model_dir, true);

								const model_idx = $data.models.bergamot.models.findIndex(x => x.locale === model.locale);

								$data.models.bergamot.models.splice(model_idx, 1);


								plugin.reactivity.updateAvailableLanguages();
								plugin.translator.update_data($data.models.bergamot);

								plugin.message_queue(`Successfully removed ${t(model.locale)} language model`);
							}}
						/>
						<Dropdown
							options={ downloadable_models }
							value=""
							onChange={async (e) => {
								const model = $settings.service_settings[service].downloadable_models.find(x => x.locale === e.target.value);
								const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

								// If there are already models installed, use the same Bergamot version as all other models,
								// otherwise use the most up-to-date version (given in data.json)
								const version = $data.models.bergamot.models ? $data.models.bergamot.version : $settings.service_settings.bergamot.version;

								// Connection speed in Bps
								let avg_download_speed = navigator.connection.downlink * 1000000;
								let total_size = model.files.reduce((acc, cur) => acc + cur.size, 0);
								const progress_bar_length = 10;
								let progress_bar = new Notice(`Downloading ${model.files.length} files\nProgress:\t\t   [${' '.repeat(progress_bar_length)}]\nRemaining time: ???s`, 0)

								// Sort files of model by size, descending
								// Larger files have a higher download speed, which will offer a better upper limit on the remaining time
								for (const [index, modelfile] of model.files.sort((a, b) => { return b.size - a.size; }).entries()) {
									const start_time = Date.now();
									const path = `.obsidian/${$settings.storage_path}/bergamot/${model.locale}/${modelfile.name}`;
									const stats = await app.vault.adapter.stat(path);
									if (stats && stats.size === modelfile.size)
										continue;
									const file = await requestUrl({url: `${rootURL}/${version}/${modelfile.usage === 'from' ? `${model.locale}en` : `en${model.locale}`}/${modelfile.name}`});


									let execution_time = (Date.now() - start_time) / 1000;
									// Add artificial slowdown to simulate slow connection (my PC is too fast to properly see progress)
									// const slowdown = 20;
									// await sleep(execution_time * slowdown * randn_bm() * 2 * 1000);
									// execution_time *= slowdown;

									// Maintain moving average of download speed
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

								const model_idx = $data.models.bergamot.models.findIndex(x => x.locale === model.locale);
								if (model_idx !== -1)
									$data.models.bergamot.models.splice(model_idx, 1);

								$data.models.bergamot.models = [...$data.models.bergamot.models, model];
								plugin.reactivity.updateAvailableLanguages();
								plugin.translator.update_data($data.models.bergamot);

								if (progress_bar.noticeEl.isConnected) {
									progress_bar.setMessage(`Successfully installed ${t(model.locale)} model\nProgress:\t\t   [${'█'.repeat(progress_bar_length)}]\nRemaining time: Finished!`);
									// Hide progress bar after 4 seconds
									setTimeout(() => {
										progress_bar.hide();
									}, 4000);
								} else {
									plugin.message_queue(`Successfully installed ${t(model.locale)} model`, 4000);
								}
							}}
						/>
					</div>
				</SettingItem>
				{/if}

			{/if}

			{#if $settings.service_settings[$settings.translation_service].filter_type !== 0}
				<SettingItem
					name="Translator languages"
					description="Choose languages to include in translator selection"
				>
					<div slot="control" transition:slide>
						<ButtonList
							items={Array.from($data.filtered_languages)
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

			{#if service !== 'bergamot'}
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
			{/if}

			<SettingItem
				name="Automatic translate"
				description="Translate text as it is being typed"
				type="text"
				notices={
					service === 'bergamot' ? [] :
					[{text: "⚠ May quickly use up the character quota for the service", style: 'warning-text'}]
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
					tooltip="Update languages"
					onClick={async () => {
						let return_values = await plugin.translator.get_languages();
						if (return_values.message)
							plugin.message_queue(return_values.message);
						if (return_values.languages) {
							if (return_values.data) {
								if (return_values.data > $data.models.bergamot.version)
									bergamot_update_available = true;
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

<h2 class="icon-text translator-title">
	<Icon icon="fasttext" size=22 />
	FastText
</h2>

<SettingItem
	name="Setup local text detection"
	description="Install FastText language models for local text detection (size: 1.72MiB)"
	type="button"
>
	<!-- FIXME: Official FastText repo does not contain wasm file, so the binary was added to the plugin's repo
		  users would probably prefer if the file was downloaded from an official place -- look for this! -->

	<div slot="control">
		<button
			class:translator-success={$data.models?.fasttext}
			class="icon-text"
			style="justify-content: center; flex: 1"
			aria-label="Install"
			on:click={async () => {
				let model_path = `.obsidian/${$settings.storage_path}/fasttext/lid.176.ftz`
				let model_result = await requestUrl({url: "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz"});
				await writeRecursive(model_path, model_result.arrayBuffer);

				let binary_path = `.obsidian/${$settings.storage_path}/fasttext/fasttext_wasm.wasm`
				let binary_result = await requestUrl({url: "https://github.com/Fevol/obsidian-translate/blob/bergamot/models/fasttext_wasm.wasm?raw=true"});
				await writeRecursive(binary_path, binary_result.arrayBuffer);

				plugin.message_queue("Successfully installed FastText data");

				$data.models.fasttext = {
					binary: {
						name: "fasttext_wasm.wasm",
						size: binary_result.arrayBuffer.byteLength,
					},
					models: {
						"compressed": {
							name: "lid.176.ftz",
							size: model_result.arrayBuffer.byteLength,
						}
					}
				}
				plugin.reactivity.setupTranslationService();
			}}
		>
			<Icon icon={"download"} />
		</button>

		{#if $data.models?.fasttext}
			<button
				transition:slide
				on:click={async (e) => {
						new ConfirmationModal(
							plugin,
							"Confirm uninstallation of FastText",
							"Are you sure you want to uninstall FastText?</div>",
							async () => {
								if (await app.vault.adapter.exists(`.obsidian/${$settings.storage_path}/fasttext`))
									await app.vault.adapter.rmdir(`.obsidian/${$settings.storage_path}/fasttext`, true);
								$data.models.fasttext = undefined;
								$data.models = $data.models;
								plugin.message_queue("Successfully uninstalled FastText");
							},
						).open();
				}}>
				Uninstall
			</button>
		{/if}
	</div>
</SettingItem>

<SettingItem
	name="Always use FastText"
	description="FastText will be used as the default text detection engine"
	type="text"
>
	<Toggle
		slot="control"
		value={ $settings.service_settings.fasttext.default_usage }
		onChange={(val) => {
			$settings.service_settings.fasttext.default_usage = val;
			plugin.reactivity.setupLanguageDetector();
		}}
	/>
</SettingItem>


<style lang="scss">
	.translator-title {
		justify-content: center;
	}

	h2 {
		gap: 10px;
	}

</style>

