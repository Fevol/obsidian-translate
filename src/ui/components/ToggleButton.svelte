<script lang="ts">
	import {Icon} from "./index";

	export let value: boolean | null = null;
	export let text: string;
	export let size: number = 16;
	export let fn: () => Promise<boolean>;

	let running: boolean = false;

</script>

<button class="translator-icon-text translator-toggle-button"
		class:translator-success={value} class:translator-fail={value === false}
		on:click={async () => {
			value = null;
			running = true;
			value = await fn();
			running = false;
		}}
>
	<div>{ text }</div>
	<Icon
		icon={running ? 'spinner' : (value === null ? 'question-mark-glyph' : (value ? 'check' : 'cross'))}
		size={size}
	/>
</button>
