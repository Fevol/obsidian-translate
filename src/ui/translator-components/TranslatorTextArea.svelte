<script lang="ts">
  export let text: string;
  export let readonly: boolean = false;
  export let placeholder: string = "";

  export let typingdelay: number = 0;
  export let onChange: (value: string) => void;
  export let onInput: (value: string) => void;
  export let onContextmenu: (e: Event) => void;
  let timer: NodeJS.Timeout | null = null;
</script>

<!-- FIXME: It is not possible to bind the value to 'value', due to ??? -->

{#if !typingdelay}
  <textarea
    class={$$props.class}
    {readonly}
    {placeholder}
    bind:value={text}
    on:input={onChange}
    {text}
    on:contextmenu={(e) => {
      onContextmenu(e);
      e.preventDefault();
      return false;
    }}
  />
{:else}
  <textarea
    class={$$props.class}
    {readonly}
    {placeholder}
    value={text}
    on:input={(e) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onChange(e);
      }, typingdelay);
    }}
    on:contextmenu={(e) => {
      onContextmenu(e);
      e.preventDefault();
      return false;
    }}
  />
{/if}
