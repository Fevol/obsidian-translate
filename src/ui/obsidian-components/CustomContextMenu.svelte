<!-- Adapted from: https://github.com/phibr0/obsidian-dictionary/blob/531296c1414c9a20eaa9e6f86e947da689d825af/src/ui/synonyms/synonymPopover.ts -->
<script lang="ts">
	import { fade } from 'svelte/transition';

	export let coords: {
		bottom: number;
		left: number;
		top: number;
	};

	// export let onSelect: (selection: string) => void;
	export let onClickOutside: () => void;

	function context_menu(node: HTMLElement) {
		// Reposition the popover to fit on screen, if needed
		const height = node.clientHeight;
		const width = node.clientWidth;

		if (coords.bottom + height > window.innerHeight)
			node.style.setProperty("top", `${coords.top - height}px`);

		if (coords.left + width > window.innerWidth)
			node.style.setProperty("left", `${window.innerWidth - width - 15}px`);

		// Fire onClickOutside if anything but the popover is clicked
		function onBodyPointerUp(e: MouseEvent) {
			if (!node.contains(e.target as Node)) {
				document.body.removeEventListener("pointerup", onBodyPointerUp);
				onClickOutside();
			}
		}

		document.body.addEventListener("pointerup", onBodyPointerUp);
	}
</script>


<div
	class="menu"
	use:context_menu
	style="left: {coords.left}px; top: {coords.bottom}px"
	in:fade="{{ duration: 50 }}"
>
	<slot name="control" />
</div>

<style>
	.translator-context-menu {
		position: absolute;
		width: 50px;
		height: 50px;
		background-color: var(--background-secondary);
	}
</style>
