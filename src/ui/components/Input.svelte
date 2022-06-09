<script lang="ts">
	import {onMount} from "svelte";
	import {setIcon} from "obsidian";

	// export let plugin: TranslatorPlugin;
	// export let text: string;
	export let type: string;
	export let val: any;
	export let placeholder: string = '';
	export let onChange: (value) => void;

</script>


<!-- FIXME: For some reason, using name 'value' causes conflicts	-->
<input
	type={type}
	value={val}
	placeholder={placeholder}
	on:input={onChange} {val}
>

