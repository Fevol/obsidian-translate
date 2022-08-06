<script lang="ts">
	import {createEventDispatcher} from "svelte";
	import type {Writable} from "svelte/store";

	import {Notice} from "obsidian";
	import TranslatorPlugin from "../../main";

	import {aesGcmDecrypt} from "../../util";
	import type {PluginData, TranslatorPluginSettings} from "../../types";

	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;
	export let plugin: TranslatorPlugin;

	let input = "";
	let invalid = false;
	const active_services = plugin.reactivity.getAllServices();

	const dispatch = createEventDispatcher();

	async function test_password() {
		try {
			let decrypted_keys: Map<string, string> = new Map();
			for (const service of Object.keys(active_services)) {
				const key = await aesGcmDecrypt($settings.service_settings[service].api_key, input);

				decrypted_keys.set(<string>service, key);
				if (key && key.endsWith("==")) {
					new Notice("Password is invalid");
					invalid = true
					return;
				}
			}

			localStorage.setItem("password", input);
			for (const [service, key] of decrypted_keys.entries())
				active_services[service].api_key = key;

			$data.password_are_encrypted = false;

			dispatch("close");

		} catch (e) {
			// If decryption fails, the input is too long/wrong
			new Notice("Password is invalid");
		}
	}

</script>

<div style="margin-bottom: 32px">
	<h3 style="text-align: center">Enter your password</h3>
	The API keys are still encrypted, please enter your password to decrypt them.
</div>

<div class="translator-password-modal-inputs">
	<b>Password:</b>
	<input
		type="password"
		value={input}
		placeholder="Type here..."
		class:translator_input_fail={invalid}
		on:keyup={(e) => {
			invalid = false;
			if (e.key === "Enter")
				test_password();
			else
				input = e.target.value;
		}}
	/>
</div>

<button class="translator-password-modal-button" on:click={async () => await test_password()}>
	Submit
</button>


<style>
	.translator-password-modal-inputs {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-gap: 24px;
		margin-bottom: 32px;
		align-items: center;
	}

	.translator-password-modal-button {
		float: right !important;
		margin-right: 0;
	}
</style>
