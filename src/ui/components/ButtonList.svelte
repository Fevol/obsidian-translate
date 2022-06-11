<script lang="ts">
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
	export let size: number = 8;
</script>

<div class="setting-command-hotkeys">
	{#each items as {value, text}}
		<span class="setting-hotkey icon-text">
			{text}
			{#if !disabled}
				<span on:click={onClick(value)} class="setting-hotkey-icon">
					<Icon icon={icon} size={size} />
				</span>
			{/if}

		</span>
	{/each}
</div>
