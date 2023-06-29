<script lang="ts">
	import { Icon } from "./index";

	export let type: string;
	export let val: any;
	export let placeholder: string = '';
	export let onChange: (value) => void;
	export let valid: boolean;

</script>


<div>
	<Icon icon={valid ? 'check' : 'cross'} class="translator-input-icon"/>
	<input
		type={type}
		value={val}
		placeholder={placeholder}
		on:input={onChange} {val}
	>
</div>
