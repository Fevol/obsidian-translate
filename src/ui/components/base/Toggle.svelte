<script lang="ts">
	export let value: boolean;
	export let onChange: (value: boolean) => void;
	export let disabled: boolean = false;
</script>

<div
	class="checkbox-container"
	class:is-enabled={value}
	on:click={() => !disabled && onChange(!value)}
>
	<input
			type="checkbox"
			tabindex="0"
			{disabled}
	/>
</div>
