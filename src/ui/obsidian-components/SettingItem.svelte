<!-- Adapted from obsidian-periodic-notes -->
<script lang="ts">
	export let name: string;
	export let description: string;
	export let isHeading: boolean = false;
	export let type: string = '';

	// [ [ text, style: [classes], url, type: href|string ], ... ]
	export let notices: string[] = [];
</script>

<div
	class="setting-item"
	class:setting-item-heading={isHeading}
	class:mod-dropdown={type === "dropdown"}
>
	<div class="setting-item-info">
		<div class="setting-item-name">
			<div>
				{name}
			</div>
		</div>
		{#if description}
			<div class="setting-item-description">
				{description}
				{#each notices as notice}
					<br>
					{#if notice.type === "href"}
						<a href={notice.url}> {notice.text} </a>
					{:else}
						<span class={notice.style}> {notice.text} </span>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
	<slot name="control"/>
</div>

<style lang="scss">
	// FIXME: Please, please, PLEASE fix this; this breaks all custom styles
	//  Brief explanation: you cannot assign classes to slots, so you either have to wrap the slot in a div,
	//  or access the slot via the :global tag over here. However, you cannot use the 'setting-item-control' class
	//  here, because the class is not defined yet.
	.setting-item-control {
		flex: 1 1 auto;
		text-align: right;
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	:global( [slot="control"] ) {
		@extend .setting-item-control;
	}
</style>
