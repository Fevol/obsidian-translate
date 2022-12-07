<script lang="ts">
	export let options: Object[] = [];
	export let item_class: string = "";
	export let show: boolean = false;
</script>

<div class={$$props.class} style={show ? "" : "display: none"}>
	{#each options as option}
		<div class={item_class} on:click={option.onClick}>
			{option.name}
		</div>
	{/each}
	{#each options as option}
		<div on:click={option.onClick} class={item_class}>
			{option.name}
		</div>
	{/each}
</div>
