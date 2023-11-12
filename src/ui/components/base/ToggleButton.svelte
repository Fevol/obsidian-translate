<script lang="ts">
	import { Icon, Spinner } from "./index";

	export let value: boolean | null = null;
	export let text: string;
	export let size: number | null = null;
	export let onToggle: () => Promise<boolean>;

	let running: boolean = false;

</script>

<button class="svelcomlib-icon-text svelcomlib-toggle"
		class:svelcomlib-success={value} class:svelcomlib-fail={value === false}
		on:click={async () => {
			value = null;
			running = true;
			value = await onToggle();
			running = false;
		}}
>
	<div>{ text }</div>
	{#if running}
		<Spinner {size}/>
	{:else}
		<Icon icon={value === null ? 'question-mark-glyph' : (value ? 'check' : 'cross')} {size} />
	{/if}
</button>
