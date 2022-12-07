<script lang="ts">
	import { Input } from "../components";
	import {Notice} from "obsidian";
	import {createEventDispatcher} from "svelte";
	import {password, settings} from "../../stores";

	import {aesGcmEncrypt, aesGcmDecrypt} from "../../util";

	let valid = null;
	let input_1 = "";
	let input_2 = "";
	let current_password = $password;
	const dispatch = createEventDispatcher();

	$: valid = (input_1 && input_2) ? input_1 === input_2 : null;
</script>

<div class="translator-password-modal-inputs">
	<b>Password:</b>
	<Input
		val={input_1}
		type="password"
		placeholder={current_password ? '(unchanged)' : 'Type here...'}
		onChange={(e) => { input_1 = e.target.value; }}
	/>

	<b>Confirm password:</b>
	<Input
		val={input_2}
		type="password"
		placeholder={current_password ? '(unchanged)' : 'Type here...'}
		onChange={(e) => { input_2 = e.target.value; }}
		valid={valid}
	/>
</div>

<button class="translator-password-modal-button" on:click={async () => {
	/** FIXME: Im not entirely sure what I could do here: close() or this.close() cause the program to shut down,
		so the best choice is to communicate directly to the parent
	 **/
	if (valid) {
		for (const service of Object.keys($settings.service_settings)) {
			let api_key = $settings.service_settings[service].api_key;
			if (api_key) {
				if (current_password)
					api_key = await aesGcmDecrypt(api_key, current_password);
				$settings.service_settings[service].api_key = await aesGcmEncrypt(api_key, input_1);
			}
		}
		app.saveLocalStorage("password", input_1);
		$password = input_1;
		dispatch("close");
	} else if (current_password && !input_1 && !input_2) {
		// Password already existed and did not change, no need to re-encrypt passwords
		dispatch("close");
	} else {
		new Notice("Passwords do not match.");
	}
}}>
	Submit
</button>
