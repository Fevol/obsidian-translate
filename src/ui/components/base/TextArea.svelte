<script lang="ts">
	export let value: string;
	export let readonly: boolean = false;
	export let placeholder: string = "";

	export let onChange: (value: string) => void;
	export let onContextmenu: (e: Event) => void;
</script>


<textarea
	class={$$props.class}
	{readonly}
	{placeholder}
	{value}
	on:change={() => { onChange(value) }}
	on:contextmenu={(e) => {
		onContextmenu(e);
		e.preventDefault();
		return false;
	}}
/>
