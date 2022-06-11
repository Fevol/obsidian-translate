<script lang="ts">
	import {onMount} from "svelte";
	import {setIcon} from "obsidian";
	import {SvelteComponent} from "svelte";

	export let icon: string | string[2];
	export let size: number;

	let icon_element : HTMLElement;

	onMount(() => {
		if (icon !== 'spinner') {
			setIcon(icon_element, icon, size);
			// resize();
		}

	});
	// TODO: Find a way to call Obsidian icon library to get the direct SVG's, because this is getting stupid

	// function resize() {
	// 	// If size was of type [width, height], resize the SVG such that it fits for one of the dimensions
	// 	if (size instanceof Array) {
	// 		icon_element = icon_element.children[0].children[0] as HTMLElement;
	// 		// FIXME: Fix this janky-ass shit,
	// 		// let child = icon_element.children[0];
	//
	// 		// let [width, height] = child.getAttribute("viewBox").split(" ").splice(2).map((x) => parseInt(x));
	// 		// let scale = Math.min(svg_size[0] / width, svg_size[1] / height);
	// 		// child.style.width = `${width * scale}px`;
	// 		// icon_element.children[0].style.height = `${height * scale}px`;
	// 		// child.setAttribute("width", (width * scale).toString());
	// 		// child.setAttribute("height", (height * scale).toString());
	// 		child.setAttribute("width", svg_size[0].toString());
	// 		child.setAttribute("height", svg_size[1].toString());
	//
	// 	}
	// }

	$: {
		// Reactivity fires once *before* the element gets mounted, understandingly, this causes errors
		if (icon_element) {
			icon_element.empty();
			if (icon !== 'spinner') {
				setIcon(icon_element, icon, size);
				// resize();
			}
		}

	}

</script>

<div bind:this={icon_element} class={$$props.class}  class:spinner={icon==='spinner'}></div>

