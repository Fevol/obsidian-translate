<script lang="ts">
	import { Button, Input, ValidateInput } from "../components";
	import {createEventDispatcher} from "svelte";

	import {aesGcmDecrypt} from "../../util";
	import {Notice} from "obsidian";
	import type {Writable} from "svelte/store";
	import type {PluginData, TranslatorPluginSettings} from "../../types";

	export let settings: Writable<TranslatorPluginSettings>;
	export let data: Writable<PluginData>;

	let input = "";
	let encrypted_api_key = "";
	let decrypted_api_key = "";

	$: encrypted_api_key = Object.values($settings.service_settings).find(x => x.api_key?.endsWith("=="))?.api_key;
	$: aesGcmDecrypt(encrypted_api_key, input).then(x => decrypted_api_key = x);

	const dispatch = createEventDispatcher();

	async function test_password() {
		try {
			let decrypted_api_key = await aesGcmDecrypt(encrypted_api_key, input);
			// If encrypted and decrypted key are the same, the input is probably empty
			if (encrypted_api_key === decrypted_api_key) {
				new Notice("Password is invalid");
			} else {
				localStorage.setItem("password", input);
				$data.api_key = await aesGcmDecrypt(encrypted_api_key, localStorage.getItem('password'));
				dispatch("close");
			}
		} catch (e) {
			// If decryption fails, the input is too long/wrong
			new Notice("Password is invalid");
		}
	}

</script>

<div style="margin-bottom: 32px">
	<h3 style="text-align: center">Enter your password</h3>
	Some of the keys were encrypted, please enter your password to decrypt them.
</div>

<div class="translator-password-modal-inputs">
	<b>Password:</b>
	<input
		type="password"
		value={input}
		placeholder="Type here..."
		on:keyup={(e) => {
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
