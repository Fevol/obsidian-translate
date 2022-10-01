<script lang="ts">
	import CustomContextMenu from "../obsidian-components/CustomContextMenu.svelte";

	export let coords: {
		bottom: number;
		left: number;
		top: number;
	};

	export let onSelect: (selection: string) => void;
	export let onClickOutside: () => void;

	export let synonyms: string[];
</script>

<CustomContextMenu
	coords={coords}
	onClickOutside={onClickOutside}
>
	<div slot="control" class="translator-context-menu-itemlist">
		{#each synonyms as synonym}
			<div class="menu-item" on:click={() => { onSelect(synonym); }}>
				{synonym}
			</div>
		{/each}
	</div>
</CustomContextMenu>

<style>
	.translator-context-menu-itemlist {
		display: flex;
		flex-direction: column;
		max-height: 200px;
		overflow-y: scroll;
	}

	.translator-context-menu-item {
		padding: var(--size-2-2) var(--size-4-2);
		cursor: pointer;
	}
</style>
