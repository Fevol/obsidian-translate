<script lang="ts">
	export let min: number = 1;
	export let max: number = 100;
	export let step: number = 1;
	export let val: number;
	export let onChange: (value) => void;
</script>


<!-- FIXME: For some reason, using name 'value' causes conflicts	-->
<input
	type="range"
	class="slider"

	value={val ? 500 : 1000}
	min={min}
	max={max}
	step={step}
	on:change={onChange} {val}
>

