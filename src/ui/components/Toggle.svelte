<!-- Adapted from obsidian-periodic-notes -->
<script lang="ts">
	import type { Writable } from "svelte/store";
	import type { TranslatorPluginSettings} from "src/types";

	export let value: boolean;
	export let onChange: (value: boolean) => void;
</script>

<div
	class="checkbox-container"
	class:is-enabled={value}
	on:click={() => onChange(!value)}>

</div>
