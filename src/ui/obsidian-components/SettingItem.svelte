<!-- Adapted from obsidian-periodic-notes -->
<script lang="ts">
	import { slide } from 'svelte/transition';

	export let name: string;
	export let description: string;

	// Type can be: ["dropdown", "toggle", "heading"]
	export let type: string = '';

	// [ [ text, style: [classes], url, type: href|string ], ... ]
	export let notices: string[] = [];
</script>

<div
	class={$$props.class + " setting-item"}
	class:mod-dropdown={type === "dropdown"}
	class:mod-toggle={type === "toggle"}
	class:mod-slider={type === "slider"}
	class:setting-item-heading={type === "heading"}
	transition:slide
>
	<div class="setting-item-info">
		<div class="setting-item-name">
			<div>
				{@html name}
			</div>
		</div>
			<div class="setting-item-description">
				{#if description}
					{@html description}
					{#each notices as notice}
						{#if notice}
							<br>
							{#if notice.type === "href"}
								<a href={notice.url}> {notice.text} </a>
							{:else}
								<span class={notice.style}> {@html notice.text} </span>
							{/if}
						{/if}
					{/each}
				{:else}
					{#each notices as notice, idx}
						{#if notice}
							{#if notice.type === "href"}
								<a href={notice.url}> {notice.text} </a>
							{:else}
								<span class={notice.style}> {@html notice.text} </span>
							{/if}
							{#if idx < notices.length - 1}
								<br>
							{/if}
						{/if}
					{/each}
				{/if}
			</div>

	</div>
	<div class="setting-item-control">
		<slot name="control"/>
	</div>
</div>
<slot name="subcontrol"/>
