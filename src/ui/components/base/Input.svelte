<script lang="ts">
	import type { HTMLInputTypeAttribute } from 'svelte/elements';

	export let type: HTMLInputTypeAttribute;
	export let value: string;
	export let placeholder: string = '';
	export let onChange: (value: string) => void = () => {};
	export let valid: boolean = false;
	export let readonly: boolean = false;
</script>

<!--TODO: value keyword is still an issue-->
<input
	{type}
	{value}
	{placeholder}
	{readonly}
	on:input={(e) => onChange(e.target.value)}
	class={$$props.class}
	class:svelcomlib-input-success={valid}
	class:svelcomlib-input-fail={valid === false}
>

