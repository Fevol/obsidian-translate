<script lang="ts">
	import {Icon} from "./index";
	import {slide} from "svelte/transition"
	import {horizontalSlide} from "../animations";

	interface IOption {
		value: string;
		text: string;
	}

	export let onClick: (value: any, index: number) => void;
	export let items: IOption[] = [];
	export let value: string;
	export let icon: string;
	export let tooltip: string = null;
	export let disabled: boolean = false;
	export let size: number = null;
</script>

<div class="setting-command-hotkeys" transition:slide>
	{#each items as {value, text}, index}
		<span class="setting-hotkey translator-icon-text" in:horizontalSlide out:horizontalSlide>
			{text}
			{#if !disabled}
				<span on:click={() => onClick(value, index)} class="setting-hotkey-icon" style="display: flex" aria-label={tooltip}>
					<Icon icon={icon} size={size} />
				</span>
			{/if}

		</span>
	{/each}
</div>
