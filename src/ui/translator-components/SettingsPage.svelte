<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {settings, data} from "../../stores";

	import {onMount} from "svelte";
	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";

	import {Icon} from ".././components";


	import type { PluginData, TranslatorPluginSettings } from "../../types";
	import {SERVICES_INFO, DEFAULT_SETTINGS, SETTINGS_TABS} from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {GeneralSettings, AppearanceSettings, DetectorSettings, TranslatorSettings} from "./settings-tabs";

	export let plugin: TranslatorPlugin;

	let bergamot_update_available = false;
	let tab = $data.tab;
	let tab_idx = SETTINGS_TABS.findIndex(t => t.id === tab);

	let translator: DummyTranslate;

	function getComponent() {
		switch (tab) {
			case "general":
				return GeneralSettings;
			case "appearance":
				return AppearanceSettings;
			case "fasttext":
				return DetectorSettings;
			default:
				return TranslatorSettings;
		}
	}

	async function changedTabs(index) {
		tab_idx = index;
		const new_tab = SETTINGS_TABS[index].id;

		if (new_tab in SERVICES_INFO && !$settings.service_settings[new_tab])
			$settings.service_settings[new_tab] = DEFAULT_SETTINGS.service_settings[new_tab];

		tab = new_tab;
		$data.tab = tab;
	}

	onMount(() => {
		tab = $data.tab;
	});

</script>

<div class:disable-animations={!$settings.enable_animations}>
	<nav class="translator-navigation-bar" tabindex="0"
		 on:keydown={e => {
			if (e.key === "Tab") {
				// FIXME: Prevent propagation of tab focus changing ONCE
				if (e.metaKey || e.ctrlKey)
					return true;
				else if (e.shiftKey)
					changedTabs((((tab_idx - 1) % SETTINGS_TABS.length) + SETTINGS_TABS.length) % SETTINGS_TABS.length);
				else
					changedTabs((tab_idx + 1) % SETTINGS_TABS.length);
				e.preventDefault();
			}
		}}
	>
		{#each SETTINGS_TABS as {id, name, icon}, index}
			<div class:translator-navigation-item-selected={tab === id} class="translator-navigation-item"
				 aria-label={`${name} settings`} on:click={() => {
					 changedTabs(index)}
				 }
			>
				<Icon icon="{icon}" size="20" />
				<div class:translator-navigation-item-text={tab !== id}>{name}</div>
			</div>
		{/each}
	</nav>

	{#key tab}
		<div in:horizontalSlide={{duration: 400, delay: 400}} out:slide={{duration: 300}}>
			<svelte:component this={getComponent()}
				plugin={plugin}
				settings={settings}
				data={data}
				service={tab}
			/>
		</div>
	{/key}
</div>




<style lang="scss">
	.translator-title {
		justify-content: center;
	}

	.translator-navigation-bar {
		display: flex;
		flex-direction: row;
		overflow-x: auto;
		overflow-y: hidden;
		flex-wrap: wrap;
		gap: 12px;

		padding: 4px 4px 16px;
		margin-bottom: 16px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.translator-navigation-item {
		cursor: pointer;
		border-radius: 100px;

		font-weight: bold;
		display: flex;
		flex-direction: row;
		white-space: nowrap;
		padding: 4px 6px;
		align-items: center;
		gap: 4px;
		outline: 0 solid transparent;

		overflow: hidden;

		background-color: var(--background-primary-secondary-alt);
		border: 1px solid var(--background-modifier-border);

		transition: color 0.25s ease-in-out,
					padding 0.25s ease-in-out,
					background-color 0.35s cubic-bezier(0.45, 0.25, 0.83, 0.67),
					max-width 0.35s cubic-bezier(0.57, 0.04, 0.58, 1),
					outline 0.15s ease-in-out;
		max-width: 32px;
		height: 32px;
	}

	.translator-navigation-item:hover {
		background-color: var(--background-primary);
		outline: 3px solid var(--text-accent);
	}

	.translator-navigation-item-selected {
		outline: unset !important;
		background-color: var(--text-accent) !important;
		color: var(--text-on-accent);
		padding: 4px 9px !important;
		max-width: 200px;
		transition: color 0.25s ease-in-out,
					padding 0.25s ease-in-out,
					background-color 0.35s cubic-bezier(0.45, 0.25, 0.83, 0.67),
					max-width 0.45s cubic-bezier(0.57, 0.04, 0.58, 1) 0.2s;
	}

	.translator-navigation-item-selected:hover {
		background-color: var(--text-accent-hover) !important;
		color: var(--text-on-accent);
	}

	.translator-navigation-item-text {
		//display: none;
		color: transparent;
		overflow: clip;
		flex: 0;
		transition: flex 0.40s ease-in,
					color 0.25s ease-in-out;
	}

	.translator-navigation-item-selected .translation-navigation-item-text {
		flex: 1;
	}
</style>

