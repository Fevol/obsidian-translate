<script lang="ts">
	export let text: any;
	export let readonly: boolean = false;
	export let placeholder: string = "";

	export let typingdelay: number = 0;
	export let onChange: (value) => void;
	export let onInput: (value) => void;
	let timer = null;
</script>


<!-- FIXME: It is not possible to bind the value to 'value', due to ??? -->
<!-- FIXME: Check if $$props.class is harmful -->

{#if !typingdelay}
	<textarea
		class={$$props.class}
		readonly={readonly}
		placeholder={placeholder}
		bind:value={text}
		on:input={onChange} {text}
	/>
{:else}
	<textarea
		class={$$props.class}
		readonly={readonly}
		placeholder={placeholder}
		value={text}
		on:input={
			(e) => {
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					onChange(e);
				}, typingdelay);
			}
		}
		on:keydown={(e) => onInput(e)}
	/>
{/if}
