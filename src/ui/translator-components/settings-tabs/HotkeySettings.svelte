<script lang="ts">
	import TranslatorPlugin from "../../../main";
	import SettingItem from "../../obsidian-components/SettingItem.svelte";
	import {Hotkey, Modifier, Platform} from "obsidian";
	import {Icon} from "../../components";
	import {settings} from "stores";
	import {onDestroy} from "svelte";
	import t from "../../../l10n";
	import {getHotKeyString} from "../../../util";

	export let plugin: TranslatorPlugin;
	let current_idx = null;

	onDestroy(() => {
		document.removeEventListener("keydown", hotkeyMapper);
	});

	const hotkeyMapper = (e) => {
		if (current_idx !== null && e.key !== "Shift" && e.key !== "Control" && e.key !== "Meta" && e.key !== "Alt") {
			let active_modifiers = [];
			if (e.ctrlKey)
				active_modifiers.push("Mod");
			if (e.metaKey)
				active_modifiers.push("Meta");
			if (e.altKey)
				active_modifiers.push("Alt");
			if (e.shiftKey)
				active_modifiers.push("Shift");
			if (active_modifiers.length || e.key.match(/^F\d+$/)) {
				let current_hotkey = $settings.hotkeys[current_idx];
				current_hotkey.modifiers = <Modifier[]>active_modifiers;
				current_hotkey.key = e.key.charAt(0).toUpperCase() + e.key.slice(1);
				$settings.hotkeys[current_idx] = current_hotkey;
				$settings.hotkeys = [...$settings.hotkeys];
			}
			// FIXME: When user presses 'Escape' without modifiers, Obsidian's UI management will take precedence and
			//  close the modal. There is seemingly no way to prevent this.
			if (active_modifiers.length || e.key.match(/^F\d+$/) || e.key === "Escape") {
				current_idx = null;
				document.removeEventListener("keydown", e => hotkeyMapper);
				return false;
			}
		}
	};
</script>

<div class="hotkey-list-container">
	{#each $settings.hotkeys as hotkey, idx}
		<SettingItem
			name={t(hotkey.id)}
		>
			<div slot="control" class="setting-item-control">
				<div class="setting-command-hotkeys">
					{#if current_idx === idx}
						<span class="setting-hotkey mod-active">Press hotkey...</span>
					{:else if !hotkey.key}
						<span class="setting-hotkey mod-empty">Blank</span>
					{:else}
						<span class="setting-hotkey">
							{getHotKeyString(hotkey)}
							<span class="setting-hotkey-icon setting-delete-hotkey" aria-label="Delete hotkey" on:click={() => {
								hotkey.modifiers = [];
								hotkey.key = "";
							}}>
								<Icon icon="cross"/>
							</span>
						</span>
					{/if}
				</div>
				<span class="clickable-icon setting-add-hotkey-button" class:mod-active={idx === current_idx} aria-label="Customize this command" on:click={() => {
					if (current_idx === null) {
						current_idx = idx;
						document.addEventListener("keydown", hotkeyMapper, true);
					} else if (current_idx !== idx) {
						current_idx = idx;
					}
				}}>
					<Icon icon="plus-circle"/>
				</span>
			</div>
		</SettingItem>
	{/each}

</div>
