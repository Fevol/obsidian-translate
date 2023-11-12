<script lang="ts">
	import { Icon } from "./index";

	export let type: string;
	export let value: string;
	export let placeholder: string = '';
	export let onChange: (value: string) => void;
	export let valid: boolean;

</script>


<div>
	<Icon icon={valid ? 'check' : 'cross'} class="svelcomlib-input-icon"/>
	<input
		{type}
		{value}
		{placeholder}
		on:input={() => onChange(value)}
	>
</div>
