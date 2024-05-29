<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { password, passwords_are_encrypted, settings } from "../../stores";

  import { Notice } from "obsidian";
  import TranslatorPlugin from "../../main";

  import { aesGcmDecrypt } from "../../util";

  export let plugin: TranslatorPlugin;

  let input = "";
  let invalid = false;
  const active_services = plugin.reactivity.getAllServices();

  const dispatch = createEventDispatcher();

  async function test_password() {
    try {
      let decrypted_keys: Map<string, string> = new Map();
      for (const service of Object.keys(active_services)) {
        const key = await aesGcmDecrypt(
          $settings.service_settings[service].api_key,
          input,
        );

        decrypted_keys.set(<string>service, key);
        if (key && key.endsWith("==")) {
          new Notice("Password is invalid, keys are still encrypted");
          invalid = true;
          return;
        }
      }

      app.saveLocalStorage("password", input);
      $password = input;
      for (const [service, key] of decrypted_keys.entries())
        active_services[service].api_key = key;

      $passwords_are_encrypted = false;

      dispatch("close");
    } catch (e) {
      // If decryption fails, the input is too long/wrong
      new Notice("Password is invalid, keys are still encrypted");
    }
  }
</script>

<div style="margin-bottom: 32px">
  <h3 style="text-align: center">
    Enter your password <div
      style="font-weight: 100; font-size: 15px; letter-spacing: 0.7px"
    >
      (Obsidian Translate)
    </div>
  </h3>
  Recover encrypted API keys from your settings by entering your password.
  <br /><br />
  You can reopen this modal via the plugin settings at any time.
</div>

<div class="translator-password-modal-inputs">
  <b>Password:</b>
  <input
    type="password"
    value={input}
    placeholder="Type here..."
    class:svelcomlib-input-fail={invalid}
    on:keyup={(e) => {
      invalid = false;
      if (e.key === "Enter") test_password();
      else input = e.target.value;
    }}
  />
</div>

<button
  class="translator-password-modal-button"
  on:click={async () => await test_password()}
>
  Submit
</button>
