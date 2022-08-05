<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {onMount} from "svelte";
	import type {Writable} from "svelte/store";
	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";

	import {Button, Dropdown, Slider, Toggle, Input, Icon, ToggleButton, ButtonList} from ".././components";
	import {SettingItem} from "../obsidian-components";
	import {ConfirmationModal, PasswordModal, PasswordRequestModal} from "../modals";

	import type { PluginData, TranslatorPluginSettings } from "../../types";
	import {SERVICES_INFO, SECURITY_MODES, DEFAULT_SETTINGS, SETTINGS_TABS, UNTESTED_SERVICES} from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {Notice, requestUrl} from "obsidian";
	import {aesGcmDecrypt, aesGcmEncrypt, humanFileSize, toTitleCase} from "../../util";
	import t from "../../l10n";

	export let plugin: TranslatorPlugin;
	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	let available_languages: string[] = [];
	let selectable_languages: any[];

	let filtered_languages: any[];
	let downloadable_models: any[];


	let bergamot_update_available = false;
	let tab = $data.tab;
	let tab_idx = SETTINGS_TABS.findIndex(t => t.id === tab);
	let info = SERVICES_INFO[tab];

	let api_key = null;


	let translator: DummyTranslate;

	if (info?.type === 'translation') {
		getAPIKey(tab, $settings.security_setting).then(key => api_key = key)
		plugin.reactivity.getTranslationService(tab, '').then(service => {
			translator = service
			available_languages = translator.available_languages || $settings.service_settings[tab].available_languages;
		});
	}

	async function getAPIKey(service: string, mode: string) {
		if (mode === 'password')
			return await aesGcmDecrypt($settings.service_settings[service].api_key, localStorage.getItem('password'));
		else if (mode === 'local_only')
			return localStorage.getItem(`${service}_api_key`);
		else if (mode === 'dont_save')
			return sessionStorage.getItem(`${service}_api_key`);
		else
			return $settings.service_settings[service].api_key;
	}

	async function setAPIKey(service: string, mode: string, key: string) {
		if (mode === "password")
			$settings.service_settings[service].api_key = await aesGcmEncrypt(key, localStorage.getItem('password'));
		else if (mode === "local_only")
			localStorage.setItem(service + '_api_key', key);
		else if (mode === "dont_save")
			sessionStorage.setItem(service + '_api_key', key);
		else
			$settings.service_settings[service].api_key = key;
	}

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
				await setAPIKey(service, new_mode, (await getAPIKey(service, old_mode)) || '');
				clearAPIKey(service, old_mode, new_mode);
			}
		}
	}


	// Update list of languages that can be selected in 'Manually select languages' option
	$: filterLanguages(available_languages);


	function filterLanguages(languages: any[]) {
		if (tab in SERVICES_INFO && SERVICES_INFO[tab].type === 'translation') {
			selectable_languages = languages
				.filter(locale => { return !$settings.service_settings[tab].selected_languages.contains(locale); })
				.map(locale => { return {'value': locale, 'text': $data.all_languages.get(locale) || locale } })
				.sort((a, b) => { return a.text.localeCompare(b.text);});
			selectable_languages.unshift({'value': '', 'text': '+'});

			filtered_languages = Array.from($settings.service_settings[tab].filter_type === 1 ?
				$data.spellchecker_languages : $settings.service_settings[tab].selected_languages)
				.filter(locale => languages.contains(locale))
				.map(locale => {return {'value': locale, 'text': $data.all_languages.get(<string>locale) || locale}})
				.sort((a, b) => a.text.localeCompare(b.text))
		}
	}


	$: {
		if (tab === 'bergamot') {
			let models = $settings.service_settings[tab].downloadable_models;
			if (models) {
				downloadable_models = Array.from(models)
					.filter(model => {
						return !$data.models.bergamot?.models.some((other) => {
							return other.locale === model.locale;
						});
					})
					.map(model => {
						return {'value': model.locale, 'text': `${$data.all_languages.get(model.locale)} (${humanFileSize(model.size, false)})${model.dev ? ' [DEV]' : ''}`};
					})
					.sort((a, b) => { return a.text.localeCompare(b.text);});
				downloadable_models.unshift({'value': '', 'text': '+'});
			}
		}
	}


	async function changedTabs(index) {
		tab_idx = index;
		let new_tab = SETTINGS_TABS[index].id;
		info = SERVICES_INFO[new_tab];

		if (new_tab in SERVICES_INFO && !$settings.service_settings[new_tab])
			$settings.service_settings[new_tab] = DEFAULT_SETTINGS.service_settings[new_tab];

		if (info?.type === 'translation') {
			if (info?.requires_api_key)
				api_key = await getAPIKey(new_tab, $settings.security_setting);
			translator = await plugin.reactivity.getTranslationService(new_tab, tab);
			available_languages = translator.available_languages || $settings.service_settings[new_tab].available_languages;
		}

		tab = new_tab;
		$data.tab = tab;
	}

	function invalidateService() {
		$settings.service_settings[tab].validated = null;
		translator.valid = null;
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
		tab = $data.tab;

		info = SERVICES_INFO[tab];
		if ($settings.translation_service === 'bergamot') {
			// We need to wait for $data.models to be loaded in before the version can be checked
			bergamot_update_available = $data.models?.bergamot?.models && $data.models.bergamot.version < $settings.service_settings.bergamot.version;
		}
	});

</script>

<div class:disable-animations={!$settings.enable_animations}>
	<nav class="translator-navigation-bar" tabindex="0"
		 on:keydown={e => {
			if (e.key === "Tab") {
				// FIXME: Prevent propagation of tab focus changing ONCE
				if (e.metaKey || e.ctrlKey)
					return true;
				else if (e.shiftKey)
					changedTabs((((tab_idx - 1) % SETTINGS_TABS.length) + SETTINGS_TABS.length) % SETTINGS_TABS.length);
				else
					changedTabs((tab_idx + 1) % SETTINGS_TABS.length);
				e.preventDefault();
			}
		}}
	>
		{#each SETTINGS_TABS as {id, name, icon}, index}
			<div class:translator-navigation-item-selected={tab === id} class="translator-navigation-item"
				 aria-label={`${name} settings`} on:click={() => {
					 changedTabs(index)}
				 }
			>
				<Icon icon="{icon}" size="20" />
				<div class:translator-navigation-item-text={tab !== id}>{name}</div>
			</div>
		{/each}
	</nav>

	{#key tab}
		<div in:horizontalSlide={{duration: 400, delay: 400}} out:slide={{duration: 300}}>
			{#if UNTESTED_SERVICES.contains(tab)}
				<div class="translator-fail translator-warning-message">
					<Icon icon="alert-triangle" size="60" />
					<div>
						<b>WARNING:</b> {info.display_name} has not been tested, so it is very likely that it does not work properly.<br><br>
						If you encounter issues, please open an issue over on <a href="https://github.com/Fevol/obsidian-translate/issues/new">GitHub</a>,
						and I will try to fix it as soon as possible.<br>
						Likewise, if the service works properly, let me know!
					</div>
				</div>
			{/if}


			{#if tab === 'general'}
				<SettingItem
					name="Translation Service"
					description="Default translation service used"
					type="dropdown"
				>
					<Dropdown
						slot="control"
						options={Object.keys(SERVICES_INFO).map((x) => {
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
					name="Filter languages"
					description="Determine which languages should be visible when translating"
					type="dropdown"
				>
					<Dropdown
						slot="control"
						options={ [
							{"value": "0", "text": 'Show all languages'},
							{"value": "1", "text": 'Sync with spellchecker'},
							{"value": "2", "text": 'Select languages manually'}
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
						{ type: 'text', text: `🛈 ${SECURITY_MODES.find(x => x.value === $settings.security_setting).info}`, style: 'info-text' }
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
							}}
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

			{:else}
				{#if info.type === "detection"}
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

									let detector = await plugin.reactivity.getTranslationService('fasttext');
									if (!detector?.detector)
										detector.setup_service($data.models.fasttext);
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


											let detector = plugin.reactivity.getExistingService('fasttext');
											if (detector)
												detector.valid = false;

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
							onChange={async (val) => {
								$settings.service_settings.fasttext.default_usage = val;
								plugin.detector = val ? await plugin.reactivity.getTranslationService("fasttext") : null;
							}}
						/>
					</SettingItem>
				{:else}
					{#if tab === 'bergamot'}
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
											translator.update_data($data.models.bergamot);
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

											translator.setup_service($data.models.bergamot, $settings.storage_path);

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
													$settings.service_settings[tab].validated = null;
													plugin.message_queue("Successfully uninstalled Bergamot and its language models");
													translator.valid = false;
													available_languages = [];
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
											'text': `${$data.all_languages.get(model.locale)} (${humanFileSize(model.size, false)})${model.dev ? ' [DEV]' : ''}`
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
											translator.update_data($data.models.bergamot);

											// Trigger reactivity
											$data.models.bergamot.models = $data.models.bergamot.models;
											available_languages = translator.available_languages;

											plugin.message_queue(`Successfully removed ${t(model.locale)} language model`);
										}}
									/>
									<Dropdown
										options={ downloadable_models }
										value=""
										onChange={async (e) => {
											const model = $settings.service_settings[tab].downloadable_models.find(x => x.locale === e.target.value);
											const rootURL = "https://storage.googleapis.com/bergamot-models-sandbox";

											// If there are already models installed, use the same Bergamot version as all other models,
											// otherwise use the most up-to-date version (given in data.json)
											const version = $data.models.bergamot.models ? $data.models.bergamot.version : $settings.service_settings.bergamot.version;

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
												translator.update_data($data.models.bergamot);
												available_languages = translator.available_languages;

												if (progress_bar.noticeEl.isConnected) {
													progress_bar.setMessage(`Successfully installed ${t(model.locale)} model\nProgress:\t\t   [${'█'.repeat(progress_bar_length)}]\nRemaining time: Finished!`);
													// Hide progress bar after 4 seconds
													setTimeout(() => progress_bar.hide(), 4000);
												} else {
													plugin.message_queue(`Successfully installed ${t(model.locale)} model`, 4000);
												}
											} catch (e) {
												if (progress_bar.noticeEl.isConnected) {
													progress_bar.setMessage(`Installation of ${t(model.locale)} model failed\nProgress:\t\t   [${'↯'.repeat(progress_bar_length)}]\nRemaining time:\t\t   Failed!\n$Reason: ${e.message}`);
												} else {
													plugin.message_queue(`Installation of ${t(model.locale)} model failed\nReason: ${e.message}`, 0);
												}
											}
										}}
									/>
								</div>
							</SettingItem>
						{/if}

					{/if}

					<SettingItem
						name="Language selection"
						description="Determine subset of languages that are available in filtered selection mode"
					>
						<div slot="control" transition:slide>
							<ButtonList
								items={ filtered_languages }
								icon="cross"
								onClick={(locale) => {
									$settings.service_settings[tab].selected_languages =
										$settings.service_settings[tab].selected_languages.filter((l) => l !== locale);
								}}
							/>
							<Dropdown
								options={ selectable_languages }
								value=""
								onChange={(e) => {
								$settings.service_settings[tab].selected_languages =
								 [...$settings.service_settings[tab].selected_languages, e.target.value];
								e.target.value = "";
							}}
							/>
						</div>
					</SettingItem>


					{#if info.request_key !== undefined}
						<SettingItem
							name="API Key"
							description="API key for translation service"
							type="text"
							notices={[
								{ type: 'href', text: "🛈 Sign up for API key here", url: info.request_key},
								...(api_key?.endsWith("==") ? [{ type: 'text', text: `⚠ API key is still encrypted`, style: 'warning-text'}] : [])
							]}
						>
							<Input
								slot="control"
								val={api_key}
								onChange={(e) => {
									api_key = e.target.value;
									translator.api_key = e.target.value;

									setAPIKey(tab, $settings.security_setting, e.target.value);
									invalidateService();
								}}
								type="text"
							/>
						</SettingItem>

						{#if info.requires_app_id}
							<SettingItem
								name="App ID"
								description="ID used for translation service"
								type="text"
							>
								<Input
									slot="control"
									val={$settings.service_settings[tab].app_id}
									onChange={(e) => {
										$settings.service_settings[tab].app_id = e.target.value;
										translator.app_id = e.target.value;

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
									value={$settings.service_settings[tab].region}
									onChange={(e) => {
										$settings.service_settings[tab].region = e.target.value;
										translator.region = e.target.value;

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
							<div slot="control">
								{#if info.host_options}
									<Dropdown
										options={info.host_options}
										value={$settings.service_settings[tab].host}
										onChange={(e) => {
										$settings.service_settings[tab].host = e.target.value;
										translator.host = e.target.value;

										invalidateService();
									}}
									/>
								{:else}
									<Input
										val={$settings.service_settings[tab].host}
										onChange={(e) => {
										$settings.service_settings[tab].host = e.target.value;
										translator.host = e.target.value;

										invalidateService();
									}}
										type="text"
									/>
								{/if}
							</div>
						</SettingItem>
					{/if}

					{#if tab !== 'bergamot'}
						<SettingItem
							name="Validate"
							description="Ensure that the translation service is set-up properly"
							type="button"
						>
							<!-- FIXME: Check if there is a way to merge the setting's writeable and the translation service's writeable, currently implementation is ugly-->
							<ToggleButton
								text="Test"
								slot="control"
								value={$settings.service_settings[tab].validated}
								fn={async () => {
									let validation_results = await translator.validate();
									translator.valid = validation_results.valid;
									if (validation_results.message)
										plugin.message_queue(validation_results.message, !validation_results.valid ? 5000 : 3000);
									if (validation_results.host)
										$settings.service_settings[tab].host = validation_results.host;
									$settings.service_settings[tab].validated = validation_results.valid;
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
							tab === 'bergamot' ? [] :
							[{text: "⚠ May quickly use up the character quota for the service", style: 'warning-text'}]
						}
					>
						<Toggle
							slot="control"
							value={ $settings.service_settings[tab].auto_translate }
							onChange={(val) => {
								$settings.service_settings[tab].auto_translate = val;
							}}
						/>
					</SettingItem>

					{#if $settings.service_settings[tab].auto_translate}
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
								value={$settings.service_settings[tab].auto_translate_interval}
								aria-label={$settings.service_settings[tab].auto_translate_interval ?
										$settings.service_settings[tab].auto_translate_interval + "ms" :
										"Instant"
										}
								on:change={(e) => {
								$settings.service_settings[tab].auto_translate_interval = parseInt(e.target.value);
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
								let return_values = await translator.get_languages();
								if (return_values.message)
									plugin.message_queue(return_values.message);
								if (return_values.languages) {
									if (return_values.data) {
										if (return_values.data > $data.models.bergamot.version)
											bergamot_update_available = true;
										$settings.service_settings[tab].downloadable_models = return_values.languages;
										$settings.service_settings[tab].version = return_values.data;
										plugin.reactivity.updateLanguageNames();
									} else {
										$settings.service_settings[tab].available_languages = return_values.languages;
									}
									plugin.message_queue("Languages updated");
								}
							}}
						/>
					</SettingItem>
				{/if}
			{/if}
		</div>
	{/key}
</div>




<style lang="scss">
	.translator-title {
		justify-content: center;
	}

	.translator-navigation-bar {
		display: flex;
		flex-direction: row;
		overflow-x: auto;
		overflow-y: hidden;
		flex-wrap: wrap;
		gap: 12px;

		padding-bottom: 16px;
		margin-bottom: 16px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.translator-navigation-item {
		cursor: pointer;
		border-radius: 100px;

		font-weight: bold;
		display: flex;
		flex-direction: row;
		white-space: nowrap;
		padding: 4px 6px;
		align-items: center;
		gap: 4px;

		overflow: hidden;

		background-color: var(--background-primary-secondary-alt);
		border: 1px solid var(--background-modifier-border);

		transition: color 0.25s ease-in-out,
					background-color 0.35s cubic-bezier(0.45, 0.25, 0.83, 0.67),
					max-width 0.45s cubic-bezier(0.57, 0.04, 0.58, 1);
		max-width: 34px;
	}

	.translator-navigation-item:hover {
		background-color: var(--background-primary);
	}

	.translator-navigation-item-selected {
		background-color: var(--text-accent) !important;
		color: var(--text-on-accent);
		padding: 4px 9px !important;
		max-width: 200px;
		transition: color 0.25s ease-in-out,
		background-color 0.35s cubic-bezier(0.45, 0.25, 0.83, 0.67),
		max-width 0.65s cubic-bezier(0.57, 0.04, 0.58, 1);
	}

	.translator-navigation-item-selected:hover {
		background-color: var(--text-accent-hover) !important;
		color: var(--text-on-accent);
	}

	.translator-navigation-item-text {
		color: transparent;
		overflow: clip;
		flex: 0;
		transition: flex 0.40s ease-in,
					color 0.25s ease-in-out;
	}

	.translator-navigation-item-selected .translation-navigation-item-text {
		flex: 1;
	}

	.translator-warning-message {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 10px;
		margin: 8px;
		border-radius: 10px;
		gap: 16px;
	}

</style>

