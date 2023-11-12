<!-- Copied over from obsidian-periodic-notes -->
<script lang="ts">
	interface IOption { value: string, text: string }
	export let onChange: (value: string, el: HTMLSelectElement) => void;
	export let options: IOption[] = [];
	export let value: string;
	export let disabled: boolean = false;
</script>

<select class={$$props.class ? $$props.class + " dropdown" : "dropdown"} {disabled} on:change={(e) => onChange(e.target.value, e.target)} value={value}>
	{#each options as { value, text }}
		<option {value}>{text}</option>
	{/each}
</select>
