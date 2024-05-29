<script lang="ts">
  import type { Modifier } from "obsidian";

  import TranslatorPlugin from "../../../main";
  import { settings } from "stores";

  import { Icon, SettingItem } from "../../components";
  import { onDestroy } from "svelte";

  import t from "../../../l10n";

  import { getHotKeyString } from "../../../util";
  import { HOTKEY_ACTIONS } from "../../../constants";

  export let plugin: TranslatorPlugin;
  let current_id: string | null = null;

  onDestroy(() => {
    document.removeEventListener("keydown", hotkeyMapper);
  });

  const hotkeyMapper = (e: KeyboardEvent) => {
    if (
      current_id !== null &&
      e.key !== "Shift" &&
      e.key !== "Control" &&
      e.key !== "Meta" &&
      e.key !== "Alt"
    ) {
      let active_modifiers = [];
      if (e.ctrlKey) active_modifiers.push("Mod");
      if (e.metaKey) active_modifiers.push("Meta");
      if (e.altKey) active_modifiers.push("Alt");
      if (e.shiftKey) active_modifiers.push("Shift");
      if (active_modifiers.length || e.key.match(/^F\d+$/)) {
        let current_hotkey = {
          id: current_id,
          modifiers: <Modifier[]>active_modifiers,
          key: e.key.charAt(0).toUpperCase() + e.key.slice(1),
        };
        $settings.hotkeys = [
          ...$settings.hotkeys.filter((h) => h.id !== current_id),
          current_hotkey,
        ];
      }
      // FIXME: When user presses 'Escape' without modifiers, Obsidian's UI management will take precedence and
      //  close the modal. There is seemingly no way to prevent this.
      if (
        active_modifiers.length ||
        e.key.match(/^F\d+$/) ||
        e.key === "Escape"
      ) {
        current_id = null;
        document.removeEventListener("keydown", (e) => hotkeyMapper);
        return false;
      }
    }
  };
</script>

<div class="hotkey-list-container">
  {#each HOTKEY_ACTIONS as hotkey, idx}
    {@const set_hotkey_idx = $settings.hotkeys.findIndex(
      (h) => h.id === hotkey.id,
    )}
    <SettingItem name={t(hotkey.id)}>
      <div slot="control" class="setting-item-control">
        <div class="setting-command-hotkeys">
          {#if current_id === hotkey.id}
            <span class="setting-hotkey mod-active">Press keys...</span>
          {:else if set_hotkey_idx === -1 || !$settings.hotkeys[set_hotkey_idx].key}
            <span class="setting-hotkey mod-empty">Blank</span>
          {:else}
            <span class="setting-hotkey">
              {getHotKeyString($settings.hotkeys[set_hotkey_idx])}
              <span
                class="setting-hotkey-icon setting-delete-hotkey"
                aria-label="Delete hotkey"
                on:click={() => {
                  $settings.hotkeys = $settings.hotkeys.filter(
                    (h) => h.id !== hotkey.id,
                  );
                }}
              >
                <Icon icon="cross" />
              </span>
            </span>
          {/if}
        </div>
        <span
          class="clickable-icon setting-add-hotkey-button"
          class:mod-active={hotkey.id === current_id}
          aria-label="Customize this command"
          on:click={() => {
            if (current_id === null) {
              current_id = hotkey.id;
              document.addEventListener("keydown", hotkeyMapper, true);
            } else if (current_id !== hotkey.id) {
              current_id = hotkey.id;
            }
          }}
        >
          <Icon icon="plus-circle" />
        </span>
      </div>
    </SettingItem>
  {/each}
</div>
