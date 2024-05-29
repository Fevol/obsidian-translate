<script>
  import { Button, Toggle, Icon, Dropdown } from "../components";
  import { DragAndDrop, TranslatorTextArea } from "../translator-components";

  import { createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";

  import {
    VIEW_MODES,
    QUICK_ACTIONS_BUTTONS,
    QUICK_SETTINGS_BUTTONS,
  } from "../../constants";

  const dispatch = createEventDispatcher();

  export let top_buttons = [];
  export let left_buttons = [];
  export let right_buttons = [];
  export let view_mode = "automatic";
  export let show_attribution = true;

  let current_editing_mode = null;
  let current_view_mode;
  let w, h;
  $: view_mode, w, h, handleResize();

  const handleResize = () => {
    if (!view_mode) {
      const width_ratio = w / h;
      if (width_ratio > 1.4) current_view_mode = "horizontal";
      else if (width_ratio > 1.2) current_view_mode = "mixed";
      else current_view_mode = "vertical";
    } else {
      current_view_mode = VIEW_MODES[view_mode].id;
    }
  };
</script>

<div class="translator-appearance-modal">
  <div class="translator-appearance-modal-header">
    <Button
      class={current_editing_mode === 0 ? "translator-focused-button" : ""}
      text="Add Quicksettings"
      onClick={() =>
        (current_editing_mode = current_editing_mode === 0 ? null : 0)}
    />
    <Button
      class={current_editing_mode === 1 ? "translator-focused-button" : ""}
      text="Alter layout"
      onClick={() =>
        (current_editing_mode = current_editing_mode === 1 ? null : 1)}
    />
    <Button
      class={current_editing_mode === 2 ? "translator-focused-button" : ""}
      text="Add Quickactions"
      onClick={() =>
        (current_editing_mode = current_editing_mode === 2 ? null : 2)}
    />
    <Button
      class={current_editing_mode === 3 ? "translator-focused-button" : ""}
      text="Show attribution info"
      onClick={() =>
        (current_editing_mode = current_editing_mode === 3 ? null : 3)}
    />
  </div>

  <div
    class="translator-appearance-modal-settings"
    class:translator-appearance-modal-settings-active={current_editing_mode !=
      null}
  >
    {#if current_editing_mode === 0}
      <div
        in:slide={{ delay: 325, duration: 250 }}
        out:slide={{ duration: 250 }}
      >
        <div class="translator-flex-row-element">
          <div class="setting-item-info">
            <div class="setting-item-name">Quick settings</div>
            <div class="setting-item-description">
              Quickly change translator's settings<br />
              <span>
                ⓘ Add these <b>quick settings</b> to the view by dragging and
                dropping
                <b style="color: var(--color-green)">green actions</b> to one of
                the two
                <b style="color: var(--color-accent)">designated areas</b>.
                Settings can be removed by dragging them to the
                <b style="color: var(--color-red)">red area</b>
              </span>
            </div>
          </div>
        </div>
        <div class="translator-dnd-header">
          <DragAndDrop
            items={[]}
            role="trashcan"
            class="translator-dnd-trashcan"
            itemstyle="translator-dnd-trashcan-item"
            tooltip="Delete action"
          />
          <DragAndDrop
            items={QUICK_SETTINGS_BUTTONS}
            role="source"
            class="translator-dnd-source translator-flex-row-element"
            itemstyle="translator-dnd-source-item"
          />
        </div>
      </div>
    {:else if current_editing_mode === 1}
      <div
        class="translator-flex-row-element"
        in:slide={{ delay: 325, duration: 250 }}
        out:slide={{ duration: 250 }}
      >
        <div class="setting-item-info">
          <div class="setting-item-name">Layout</div>
          <div class="setting-item-description">
            Determine the layout of the translator<br />
            <span class="svelcomlib-notice-info">
              `Automatic` layout will adapt the layout<br />based on the width
              and height of the view
            </span>
          </div>
        </div>
        <Dropdown
          value={view_mode}
          options={[
            { value: 0, text: "Automatic" },
            { value: 1, text: "Vertical" },
            { value: 2, text: "Mixed" },
            { value: 3, text: "Horizontal" },
          ]}
          onChange={(value) => {
            view_mode = parseInt(value);
          }}
        />
      </div>
    {:else if current_editing_mode === 2}
      <div
        in:slide={{ delay: 325, duration: 250 }}
        out:slide={{ duration: 250 }}
      >
        <div class="translator-flex-row-element">
          <div class="setting-item-info">
            <div class="setting-item-name">Quick settings</div>
            <div class="setting-item-description">
              Quickly change translator's settings<br />
              <span>
                ⓘ Add these <b>quick actions</b> to the view by dragging and
                dropping
                <b style="color: var(--color-green)">green actions</b> to one of
                the two
                <b style="color: var(--color-accent)">designated areas</b>.
                Actions can be removed by dragging them to the
                <b style="color: var(--color-red)">red area</b>
              </span>
            </div>
          </div>
        </div>
        <div class="translator-dnd-header">
          <DragAndDrop
            items={[]}
            role="trashcan"
            class="translator-dnd-trashcan"
            itemstyle="translator-dnd-trashcan-item"
            tooltip="Delete action"
          />
          <DragAndDrop
            items={QUICK_ACTIONS_BUTTONS}
            role="source"
            class="translator-dnd-source translator-flex-row-element"
            itemstyle="translator-dnd-source-item"
          />
        </div>
      </div>
    {:else if current_editing_mode === 3}
      <div
        class="translator-flex-row-element"
        in:slide={{ delay: 325, duration: 250 }}
        out:slide={{ duration: 250 }}
      >
        <div class="setting-item-info">
          <div class="setting-item-name">Attribution info</div>
          <div class="setting-item-description">
            Add attribution to the bottom of the view
          </div>
        </div>
        <Toggle
          value={show_attribution}
          onChange={async (value) => {
            show_attribution = value;
          }}
        />
      </div>
    {:else}
      <div />
    {/if}
  </div>

  <div class="translator-appearance-modal-contents">
    <div class="nav-header">
      <div class="nav-buttons-container">
        <DragAndDrop
          bind:items={top_buttons}
          dragDisabled={current_editing_mode !== 0}
          itemstyle="nav-action-button translator-quicksetting-button"
          class={`translator-appearance-modal-view-header translator-textarea-quickbuttons-editing
								${current_editing_mode === 0 ? "translator-focused-element" : ""}`}
        />
      </div>
    </div>
    <div
      bind:clientWidth={w}
      bind:clientHeight={h}
      class={`translator-view translator-appearance-modal-view translator-${current_view_mode}-layout`}
      class:translator-focused-element={current_editing_mode === 1}
      style="overflow-x: hidden"
    >
      <div class="translator-column translator-left-column">
        <Dropdown
          disabled={true}
          value={"auto"}
          options={[{ value: "auto", text: "Detect Language (English)" }]}
        />
        <div class="translator-textarea-column">
          <TranslatorTextArea
            placeholder="Type here..."
            class="translator-textarea"
            readonly={true}
          />
          <DragAndDrop
            bind:items={left_buttons}
            dragDisabled={current_editing_mode !== 2}
            itemstyle="translator-rounded-button clickable-icon"
            class={`translator-textarea-quickbuttons translator-textarea-quickbuttons-editing
							 		${current_editing_mode === 2 ? "translator-focused-element" : ""}`}
          />
        </div>
      </div>

      <div class="translator-button-container translator-center-column">
        <button class="translator-button" aria-label="Switch languages around">
          <Icon icon="switch" size={20} />
        </button>

        <button class="translator-button" aria-label="Translate">
          <Icon icon="translate" size={20} />
        </button>
      </div>

      <div class="translator-column translator-right-column">
        <Dropdown
          disabled={true}
          value={"fr"}
          options={[{ value: "fr", text: "French" }]}
        />
        <div class="translator-textarea-column">
          <TranslatorTextArea
            placeholder="Translation"
            class="translator-textarea"
            readonly={true}
          />
          <DragAndDrop
            bind:items={right_buttons}
            dragDisabled={current_editing_mode !== 2}
            itemstyle="translator-rounded-button clickable-icon"
            class={`translator-textarea-quickbuttons translator-textarea-quickbuttons-editing
							 		${current_editing_mode === 2 ? "translator-focused-element" : ""}`}
          />
        </div>
      </div>
      {#if show_attribution}
        <div
          class="translator-appearance-modal-attribution translator-attribution-column translator-unfocused-element"
          class:translator-focused-element={current_editing_mode === 3}
          transition:slide
        >
          <div class="translator-attribution-column-text">
            Using
            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              class="translator-icon-text translator-service-text"
            >
              <Icon icon="translate" />
              Dummy Translate
            </a>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="translator-confirmation-buttons">
    <button on:click={async () => dispatch("close")}> Cancel </button>

    <button
      class="svelcomlib-success"
      on:click={async () => {
        dispatch("close", {
          view_mode,
          show_attribution,
          top_buttons,
          left_buttons,
          right_buttons,
        });
      }}
    >
      Confirm
    </button>
  </div>
</div>
