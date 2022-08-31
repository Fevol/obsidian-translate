<script lang="ts">
	export let type: string;
	export let val: any;
	export let placeholder: string = '';
	export let onChange: (value) => void;
	export let valid: boolean = null;
	export let readonly: boolean = false;
</script>


<!-- FIXME: For some reason, using name 'value' causes conflicts	-->
<input
	type={type}
	value={val}
	placeholder={placeholder}
	readonly={readonly}
	on:input={onChange} {val}
	class={$$props.class}
	class:translator_input_success={valid}
	class:translator_input_fail={valid === false}
>

