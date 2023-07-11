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
	export let default_value: string = "";

	$: value, setDefaultValue();

	function setDefaultValue() {
		if (default_value && options.findIndex((option) => option.value === value) === -1)
			value = default_value;
	}
</script>

<select class={$$props.class ? $$props.class + " dropdown" : "dropdown"} disabled={disabled} on:change={onChange} {value}>
	{#each options as { value, text }}
		<option {value}>{text}</option>
	{/each}
</select>
