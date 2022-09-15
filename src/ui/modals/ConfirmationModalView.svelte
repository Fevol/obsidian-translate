<script lang="ts">
	import {createEventDispatcher} from "svelte";
	const dispatch = createEventDispatcher();

	export let callback: () => void;
	export let title: string;
	export let description: string;


</script>

<h3 style="text-align: center">{@html title}</h3>
{@html description}

<div class="confirmation-buttons">
	<button on:click={async () => dispatch("close")}>
		Cancel
	</button>

	<button class="translator-fail"
		on:click={async () => {
			await callback();
			dispatch("close");
	}}>
		Confirm
	</button>
</div>



<style>
	.confirmation-buttons {
		display: flex;
		justify-content: right;
		margin-top: 1em;
		gap: var(--size-4-2);
	}
</style>
