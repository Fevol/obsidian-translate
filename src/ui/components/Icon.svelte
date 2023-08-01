<script lang="ts">
	import {getIcon} from "obsidian";

	export let icon: string;
	export let size: number | [number, number] | string = null;
	export let stroke_width: number = null;

	let icon_element: SVGElement;

	function setSize() {

	}


	$: {
		if (icon !== 'spinner') {
			if (!icon.startsWith('<svg')) {
				icon_element = getIcon(icon);
			} else {
				icon_element = <SVGElement>new DOMParser().parseFromString(icon, 'text/html').body.childNodes[0];
			}

			if ($$props.class)
				icon_element.classList.add(...$$props.class.split(' '));
		} else {
			icon_element.innerHTML = '';
			icon_element.classList.add('translator-spinner');
		}
	}

	$: {
		if (icon_element && size) {
			if (typeof size === 'number') {
				icon_element.style.width = size + 'px';
				icon_element.style.height = size + 'px';
			} else if (Array.isArray(size)) {
				icon_element.style.width = size[0] + 'px';
				icon_element.style.height = size[1] + 'px';
			} else {
				icon_element.style.width = `var(--${size})`;
				icon_element.style.height = `var(--${size})`;
				icon_element.style.strokeWidth = `var(--${size}-stroke-width)`;
			}
		}
	}

	$: {
		if (icon_element && stroke_width) {
			icon_element.style.strokeWidth = stroke_width + 'px';
		}
	}
</script>

{@html icon_element.outerHTML}
