<script lang="ts">
	export let text: any;
	export let readonly: boolean = false;
	export let onChange: (value) => void;

</script>


<!-- FIXME: It is not possible to bind the value to 'value', due to ??? -->
<!-- FIXME: Check if $$props.class is harmful -->
<textarea
	class={$$props.class}
	readonly={readonly}
	bind:value={text}
	on:input={onChange} {text}
/>

