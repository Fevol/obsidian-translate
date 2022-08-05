<script lang="ts">
	import {Icon} from '.././components'

	// { icon: 'icon-name', tooltip: 'tooltip text', onClick: () => { functionality } }
	export let buttons: Object[];
</script>

<div class="nav-header">
	{#if buttons}
		<div class="nav-buttons-container">
			{#each buttons as button}
				<div aria-label={button.tooltip} on:click={() => button.onClick()} class="nav-action-button">
					<Icon icon={button.icon}/>
				</div>
			{/each}
		</div>
	{/if}
</div>
