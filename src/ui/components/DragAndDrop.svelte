<script>
	import {flip} from "svelte/animate";
	import {dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME, TRIGGERS} from "svelte-dnd-action";
	import {Icon} from "../components";
	import Button from "./Button.svelte";

	export let items = [];
	export let itemstyle = "";
	export let role = "regular";
	export let tooltip;
	export let dragDisabled;


	let ignoring_dnd_events = false;
	let dropFromOthersDisabled = false;

	export let button_states = items.map(() => 0);
	$: dropFromOthersDisabled =  dragDisabled || role === "source";

	const flipDurationMs = 300;
	const dropTargetStyle = {
		"outline": "2px dashed var(--color-accent)",
	};

	function handleDndConsider(e) {
		if (role === 'source') {
			const {trigger, id} = e.detail.info;

			// Generating a new item
			if (trigger === TRIGGERS.DRAG_STARTED) {
				const idx = items.findIndex(item => item.id === id);
				const new_id = `${id}_copy${Math.random() * 1000000}`;

				e.detail.items = e.detail.items.filter(item => !item[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
				e.detail.items.splice(idx, 0, {...items[idx], id: new_id});
				items = e.detail.items;
				ignoring_dnd_events = true;
			} else if (!ignoring_dnd_events) {
				items = e.detail.items;
			} else {
				items = [...items];
			}
		} else {
			items = e.detail.items;
			button_states = items ? items.map(() => 0) : [];
		}
	}
	function handleDndFinalize(e) {
		if (role === 'trashcan') {
			items = [];
		} else if (role === 'source') {
			if (!ignoring_dnd_events) {
				items = e.detail.items;
			} else {
				items = [...items];
				ignoring_dnd_events = false;
			}
		} else {
			items = e.detail.items;
			button_states = items ? items.map(() => 0) : items;
		}
	}
</script>

<section aria-label={tooltip} class={$$props.class} use:dndzone={{items, flipDurationMs, dropTargetStyle, dropFromOthersDisabled, dragDisabled}} on:consider="{handleDndConsider}" on:finalize="{handleDndFinalize}">
	{#each items as item, index (item.id)}
		<div animate:flip="{{duration: flipDurationMs}}" class={`flex-row-element ${itemstyle}`} aria-label={item.tooltip[dragDisabled ? button_states[index] : 0]}
			on:click={() => {
				if (dragDisabled) {
					button_states[index] = (button_states[index] + 1) % item.tooltip.length
				}
			}
		}>
			<Icon icon={item.icon[dragDisabled ? button_states[index] : 0]}/>
		</div>
	{/each}
</section>
