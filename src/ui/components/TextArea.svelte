<script lang="ts">
	import {onMount} from "svelte";
	import {setIcon} from "obsidian";

	// export let plugin: TranslatorPlugin;
	export let text: any;
	export let readonly: boolean = false;
	export let onChange: (value) => void;

</script>


<!-- FIXME: It is not possible to bind the value to 'value', due to ??? -->
<!-- FIXME: Check if $$props.class is harmful -->
<textarea
	class={$$props.class}
	readonly={readonly}
	bind:value={text}
	on:input={onChange} {text}
/>

