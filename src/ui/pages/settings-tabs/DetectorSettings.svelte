<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, fasttext_data} from "../../../stores";
	import {slide} from "svelte/transition";
	import {onMount} from "svelte";

	import {Toggle, Icon, SettingItem} from "../../components";

	import {ConfirmationModal} from "../../modals";

	import {requestUrl} from "obsidian";
	import {writeRecursive} from "../../../obsidian-util";
	import {DEFAULT_SETTINGS} from "../../../constants";
	import {DummyTranslate} from "../../../handlers";


	export let plugin: TranslatorPlugin;

	if (!$settings.service_settings.fasttext)
		$settings.service_settings.fasttext = DEFAULT_SETTINGS.service_settings.fasttext;

	let detector: DummyTranslate;

	onMount(async () => {
		detector = await plugin.reactivity.getTranslationService('fasttext');
	});

</script>

<SettingItem
	name="Setup local language detection"
	description="Install FastText language models for local language detection (size: 1.72MiB)"
	type="button"
>
	<!-- FIXME: Official FastText repo does not contain wasm file, so the binary was added to the plugin's repo
		  users would probably prefer if the file was downloaded from an official place -- look for this! -->

	<div slot="control" class="setting-item-control">
		<button
			class:svelcomlib-success={$fasttext_data.binary}
			class="translator-icon-text"
			aria-label="Install"
			on:click={async () => {
				let model_path = `${plugin.app.vault.configDir}/plugins/translate/models/fasttext/lid.176.ftz`
				let model_result = await requestUrl({url: "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz"});
				await writeRecursive(plugin.app, model_path, model_result.arrayBuffer);

				let binary_path = `${plugin.app.vault.configDir}/plugins/translate/models/fasttext/fasttext_wasm.wasm`
				let binary_result = await requestUrl({url: "https://github.com/Fevol/obsidian-translate/blob/master/models/fasttext_wasm.wasm?raw=true"});
				await writeRecursive(plugin.app, binary_path, binary_result.arrayBuffer);

				plugin.message_queue("Successfully installed FastText data");

				const models = {
					binary: {
						name: "fasttext_wasm.wasm",
						size: binary_result.arrayBuffer.byteLength,
					},
					models: {
						"compressed": {
							name: "lid.176.ftz",
							size: model_result.arrayBuffer.byteLength,
						}
					},
					version: "1.0.0",
				}

				detector = await plugin.reactivity.getTranslationService('fasttext');
				if (!detector?.detector)
					detector.setup_service(models);
				detector.valid = true;
				$fasttext_data = models;
				plugin.detector = detector;
			}}
		>
			<Icon icon={"download"} />
		</button>

		{#if $fasttext_data.binary}
			<button
				transition:slide
				on:click={async (e) => {
				new ConfirmationModal(
					plugin,
					"Confirm uninstallation of FastText",
					"Are you sure you want to uninstall FastText?</div>",
					async () => {
						if (await plugin.app.vault.adapter.exists(`${plugin.app.vault.configDir}/plugins/translate/models/fasttext`))
							await plugin.app.vault.adapter.rmdir(`${plugin.app.vault.configDir}/plugins/translate/models/fasttext`, true);
						$fasttext_data = {
							binary: undefined,
							models: undefined,
						}

						if (detector) {
							detector.valid = false;
							detector.default = false;
						}

						plugin.message_queue("Successfully uninstalled FastText");
					},
				).open();
			}}>
				Uninstall
			</button>
		{/if}
	</div>
</SettingItem>

{#if $fasttext_data.binary}
	<SettingItem
		name="Always use FastText"
		description="FastText will be used as the default language detection service"
		subsetting={true}
		type="toggle"
	>
		<Toggle
			slot="control"
			value={ $settings.service_settings.fasttext.default_usage }
			onChange={async (value) => {
				$settings.service_settings.fasttext.default_usage = value;
				plugin.detector.default = value;
			}}
		/>
	</SettingItem>
{/if}
