<script lang='ts'>
	import { Icon } from "./"

	interface State {
		icon?: string,
		text?: string,
		tooltip?: string
	}

	export let states: State[];
	export let value: number = 0;
	export let size: number | null = null;
	export let onClick: () => void = () => {};
	export let onContextMenu: (e: Event) => void = () => {};
</script>

<div class={$$props.class + ' svelcomlib-icon-text'} aria-label={states[value].tooltip}
	on:click={() => {
		value = (value + 1) % states.length;
		onClick();
	}}
	on:contextmenu={onContextMenu}
>
	{#if states[value].icon}
		<Icon icon={states[value].icon} {size}/>
	{/if}

	{#if states[value].text}
		{states[value].text}
	{/if}
</div>
