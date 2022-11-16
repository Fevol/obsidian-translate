<script>
	import {Button, Icon, Dropdown, TextArea, DragAndDrop} from "../components";
	import {SettingItem} from "../obsidian-components/";
	import {scale, fade, slide} from "svelte/transition";
	import Toggle from "../components/Toggle.svelte";
	import {SERVICES_INFO, VIEW_MODES} from "../../constants";
	import {createEventDispatcher} from "svelte";

	const dispatch = createEventDispatcher()

	let selectable_actions = [
		{id: "copy", text: "Copy", icon: "copy"},
		{id: "paste", text: "Paste", icon: "clipboard-check"},
		{id: "clear", text: "Clear", icon: "x"},
	];

	export let left_buttons = [];
	export let right_buttons = [];
	export let view_mode = "automatic";
	export let show_attribution = true;

	let current_view_mode;
	let w, h;
	$: view_mode, w, h, handleResize();

	const handleResize = () => {
		if (!view_mode) {
			const width_ratio = w / h;
			if (width_ratio > 1.4)
				current_view_mode = "horizontal";
			else if (width_ratio > 1.2)
				current_view_mode = "mixed";
			else
				current_view_mode = "vertical";
		} else {
			current_view_mode = VIEW_MODES[view_mode].id;
		}
	};

</script>

<div class="translator-appearance-modal">

	<div class="translator-appearance-modal-settings">
		<SettingItem
			name="Layout"
			description="Choose the layout of the translator"
		>
			<Dropdown
				slot="control"
				class="translator-select"
				value={view_mode}
				options={[
					{ value: 0, text: 'Automatic', },
					{ value: 1, text: 'Vertical', },
					{ value: 2, text: 'Mixed', },
					{ value: 3, text: 'Horizontal', }
				]}
				onChange={(e) => {
					view_mode = parseInt(e.target.value);
				}}
			/>
		</SettingItem>
		<SettingItem
			name="Attribution info"
			description="Add attribution to the bottom of the view"
		>
			<Toggle
				slot="control"
				value={ show_attribution }
				onChange={async (e) => { show_attribution = !show_attribution; }}
			/>
		</SettingItem>
		<SettingItem
			name="Quick actions"
			description="Allows you to quickly execute actions on the respective text areas"
			notices={[
				{ text: "ⓘ Add these <b>quick actions</b> to the view by dragging and dropping <b style='color: var(--color-green)'>green actions</b> to one of the two <b style='color: var(--color-accent)'>designated areas</b>. Actions can be removed by dragging them to the <b style='color: var(--color-red)'>red area</b>.", type: "info-text" },
			]}
		>
			<div class="translator-dnd-header" slot="subcontrol">
				<DragAndDrop items={[]} role="trashcan" class="translator-dnd-trashcan" itemstyle="translator-dnd-trashcan-item" tooltip="Delete action"/>

				<DragAndDrop items={selectable_actions} role="source" class="translator-dnd-source flex-row-element" itemstyle="translator-dnd-source-item" />
			</div>
		</SettingItem>
	</div>


	<div
		bind:clientWidth={w} bind:clientHeight={h}
		class={`translator-view translator-appearance-modal-view ${current_view_mode}`}
		style="overflow-x: hidden"
	>
		<div class="translator-column translator-left-column">
			<Dropdown
				disabled={true}
				class="translator-select"
				value={"auto"}
				options={[{"value": "auto", "text": "Detect Language (English)"}]}
			/>
			<div class="translator-textarea-column">
				<TextArea
					placeholder="Type here..."
					class="translator-textarea"
					readonly={true}
				/>
				<DragAndDrop bind:items={left_buttons}
							 itemstyle="rounded-translator-button"
							 class={`translator-textarea-quickbuttons translator-textarea-quickbuttons-editing`}
				/>
			</div>
		</div>

		<div class="translator-button-container translator-center-column">
			<button class="translator-button" aria-label="Switch languages around">
				<Icon icon=switch size={20}/>
			</button>

			<button class="translator-button"  aria-label="Translate">
				<Icon icon=translate size={20}/>
			</button>
		</div>

		<div class="translator-column translator-right-column">
			<Dropdown
				disabled={true}
				class="translator-select"
				value={"fr"}
				options={[{"value": "fr", "text": "French"}]}
			/>
			<div class="translator-textarea-column">
				<TextArea
					placeholder="Translation"
					class="translator-textarea"
					readonly={true}
				/>
				<DragAndDrop bind:items={right_buttons}
							 itemstyle="rounded-translator-button"
							 class={`translator-textarea-quickbuttons translator-textarea-quickbuttons-editing`}
				/>
			</div>
		</div>
		{#if show_attribution}
			<div class="translator-appearance-modal-attribution translator-attribution-column translator-unfocused-element" transition:slide>
				<div class="translator-attribution-column-text">
					Using
					<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" class="icon-text translator-service-text">
						<Icon icon="translate"/>
						Dummy Translate
					</a>
				</div>
			</div>
		{/if}
	</div>

	<div class="translator-confirmation-buttons">
		<button on:click={async () => dispatch("close")}>
			Cancel
		</button>

		<button class="translator-success"
			on:click={async () => {
				dispatch("close", { view_mode, show_attribution, left_buttons, right_buttons });
			}}>
			Confirm
		</button>
	</div>
</div>

