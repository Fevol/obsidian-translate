<script lang='ts'>
	import { onMount } from 'svelte';
	import { Component, MarkdownRenderer } from 'obsidian';
	import type CommentatorPlugin from '../../../main';

	export let plugin: CommentatorPlugin;
	export let text: string;
	export let source: string = '';
	let element: HTMLElement;

	onMount(async () => {
		const component = new Component();
		await MarkdownRenderer.render(plugin.app, text, element, source, component);
		component.load();
	})
</script>

<div bind:this={element} class={$$props.class}></div>
