<script lang="ts">
	export let type: string;
	export let val: any;
	export let placeholder: string = '';
	export let onChange: (value) => void;
	export let valid: boolean = null;
	export let readonly: boolean = false;
</script>


<!--NOTE TO SELF: If input parameter is 'value', then something breaks -->
<input
	type={type}
	value={val}
	placeholder={placeholder}
	readonly={readonly}
	on:input={onChange} {val}
	class={$$props.class}
	class:translator-input-success={valid}
	class:translator-input-fail={valid === false}
>

