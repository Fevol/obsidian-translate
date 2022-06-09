<script lang="ts">
	import {onMount} from "svelte";
	import {setIcon} from "obsidian";

	import {Icon} from "./index";

	// export let plugin: TranslatorPlugin;
	export let value: boolean | null = null;
	export let text: string = "Test";
	export let size: number = 16;
	export let fn: () => Promise<boolean>;

	let running: boolean = false;

</script>

<button class="icon-text translator-toggle-button"
		class:translator-success={value} class:translator-fail={value === false}
		on:click={async () => {
			value = null;
			running = true;
			value = await fn();
			console.log('Pressed button', value);
			running = false;
		}}
>
	<div>{ text }</div>
	<Icon
		icon={running ? 'spinner' : (value === null ? 'question-mark-glyph' : (value ? 'check' : 'cross'))}
		size={size}
	/>
</button>
