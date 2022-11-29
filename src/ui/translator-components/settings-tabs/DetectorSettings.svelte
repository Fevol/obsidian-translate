<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {settings, data} from "../../../stores";
	import {slide} from "svelte/transition";

	import {Toggle, Icon} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	import {ConfirmationModal} from "../../modals";

	import {requestUrl} from "obsidian";
	import {writeRecursive} from "../../../obsidian-util";
	import {DEFAULT_SETTINGS} from "../../../constants";


	export let plugin: TranslatorPlugin;

	if (!$settings.service_settings.fasttext)
		$settings.service_settings.fasttext = DEFAULT_SETTINGS.service_settings.fasttext;

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
			class:translator-success={$data.models?.fasttext}
			class="icon-text"
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
				detector.valid = true;
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
	description="FastText will be used as the default language detection service"
	type="toggle"
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
