<!-- Adapted from obsidian-periodic-notes -->
<script lang="ts">
	export let value: boolean;
	export let onChange: (value: boolean) => void;
</script>

<div
	class="checkbox-container"
	class:is-enabled={value}
	on:click={() => onChange(!value)}>
	<input type="checkbox" tabindex="0"/>
</div>
