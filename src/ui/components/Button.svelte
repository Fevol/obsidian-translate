<script lang="ts">
	import {Icon} from "./index";

	export let text: string;
	export let icon: string = '';
	export let size: number = 16;
	export let onClick: () => void;

</script>

<button
	class={$$props.class}
	class:icon-text={icon}
	on:click={() => onClick()}
>
	{#if text}
		<div>{ text }</div>
	{/if}
	{#if icon}
	<Icon
		icon={icon}
		size={size}
	/>
	{/if}
</button>
