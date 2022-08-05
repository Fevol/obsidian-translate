<script lang="ts">

	// [ { name: "", value: "", onClick: () => {} }, ... ]
	export let options: Object[] = [];
	export let item_class: string = "";
	export let show: boolean = false;
</script>

<div class:hide={!show} class={$$props.class}>
	{#each options as option}
		<div on:click={option.onClick} class={item_class}>
			{option.name}
		</div>
	{/each}
</div>

<style lang="scss">
	.hide {
		display: none;
	}
</style>
