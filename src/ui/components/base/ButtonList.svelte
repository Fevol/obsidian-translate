<script lang="ts">
	import {Icon} from "./index";

	interface IOption {
		value: string;
		text: string;
	}

	export let onClick: (value: string, index: number) => void;
	export let items: IOption[] = [];
	export let icon: string;
	export let tooltip: string | null = null;
	export let disabled: boolean = false;
	export let size: number | null = null;
</script>

<div class="setting-command-hotkeys">
	{#each items as {value, text}, index}
		<span class="setting-hotkey svelcomlib-icon-text">
			{text}
			{#if !disabled}
				<span on:click={() => onClick(value, index)} class="setting-hotkey-icon" style="display: flex" aria-label={tooltip}>
					<Icon {icon} {size} />
				</span>
			{/if}
		</span>
	{/each}
</div>
