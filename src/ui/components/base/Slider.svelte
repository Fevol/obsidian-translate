<script lang="ts">
	export let min: number;
	export let max: number;
	export let step: number;
	export let value: number;
	export let onChange: (value: number) => void;
	export let getTooltip: (value: number) => string = (value: number) => value.toString();
</script>


<input
	type="range"
	class="slider"

	bind:value={value}
	{min}
	{max}
	{step}
	on:input={() => {
		const tooltip_el = document.body.lastChild;
		if (tooltip_el.classList.contains("tooltip")) {
			// Manually grabbing the tooltip and forcefully updating it, as I do not have the proper reference to it
			// Note: width="auto" is necessary, as width is exactly set, and sometimes the text overflows
			tooltip_el.firstChild.textContent = getTooltip(value);
			tooltip_el.style.width = "auto";
		}
	}}
	on:change={(e) => {
		onChange(value);
	}}

	aria-label={getTooltip(value)}
	data-tooltip-position="top"
/>

