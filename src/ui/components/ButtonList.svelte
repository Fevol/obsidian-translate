<script lang="ts">
	import type {Writable} from "svelte/store";
	import type {TranslatorPluginSettings} from "src/types";
	import {Icon} from "./index";

	interface IOption {
		value: string;
		text: string;
	}

	export let onClick: (value: any) => void;
	export let items: IOption[] = [];
	export let value: string;
	export let icon: string;
	export let disabled: boolean;
</script>

<div class="setting-command-hotkeys">
	{#each items as {value, text}}
		<span class="setting-hotkey">
			{text}
			{#if !disabled}
				<span on:click={onClick(value)} class="setting-hotkey-icon">
					<Icon icon={icon} />
				</span>
			{/if}

		</span>
	{/each}
</div>
