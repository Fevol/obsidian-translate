<!-- Copied over from obsidian-periodic-notes -->
<script lang="ts">
	interface IOption {
		value: string;
		text: string;
	}
	export let onChange: (value: any) => void;
	export let options: IOption[] = [];
	export let value: string;
	export let disabled: boolean = false;
</script>

<select class={$$props.class + " dropdown"} disabled={disabled} on:change={onChange} {value}>
	{#each options as { value, text }}
		<option {value}>{text}</option>
	{/each}
</select>
