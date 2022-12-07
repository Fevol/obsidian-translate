<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, fasttext_data} from "../../../stores";
	import {slide} from "svelte/transition";
	import {onMount} from "svelte";

	import {Toggle, Icon} from "../../components";
	import {SettingItem} from "../../obsidian-components";

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
			class:translator-success={$fasttext_data.binary}
			class="translator-icon-text"
			aria-label="Install"
			on:click={async () => {
				let model_path = `${app.vault.configDir}/plugins/obsidian-translate/models/fasttext/lid.176.ftz`
				let model_result = await requestUrl({url: "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz"});
				await writeRecursive(model_path, model_result.arrayBuffer);

				let binary_path = `${app.vault.configDir}/plugins/obsidian-translate/models/fasttext/fasttext_wasm.wasm`
				let binary_result = await requestUrl({url: "https://github.com/Fevol/obsidian-translate/blob/master/models/fasttext_wasm.wasm?raw=true"});
				await writeRecursive(binary_path, binary_result.arrayBuffer);

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
						if (await app.vault.adapter.exists(`${app.vault.configDir}/plugins/obsidian-translate/models/fasttext`))
							await app.vault.adapter.rmdir(`${app.vault.configDir}/plugins/obsidian-translate/models/fasttext`, true);
						$fasttext_data = {
							binary: undefined,
							models: undefined,
							valid: undefined
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
		type="toggle"
	>
		<Toggle
			slot="control"
			value={ $settings.service_settings.fasttext.default_usage }
			onChange={async (val) => {
				$settings.service_settings.fasttext.default_usage = val;
				plugin.detector.default = val;
			}}
		/>
	</SettingItem>
{/if}
