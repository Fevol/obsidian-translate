<script lang="ts">
	import {Icon} from "./index";
	import {slide} from "svelte/transition"
	import {horizontalSlide} from "../animations";

	interface IOption {
		value: string;
		text: string;
	}

	export let onClick: (value: any) => void;
	export let items: IOption[] = [];
	export let value: string;
	export let icon: string;
	export let tooltip: string;
	export let disabled: boolean;
	export let size: number = 8;
</script>

<div class="setting-command-hotkeys" transition:slide>
	{#each items as {value, text}}
		<span class="setting-hotkey icon-text" in:horizontalSlide out:horizontalSlide>
			{text}
			{#if !disabled}
				<span on:click={onClick(value)} class="setting-hotkey-icon setting-delete-hotkey icon-center" style="justify-content: center" aria-label={tooltip}>
					<Icon icon={icon} size={size} />
				</span>
			{/if}

		</span>
	{/each}
</div>
