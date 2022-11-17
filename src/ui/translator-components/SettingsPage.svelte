<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {settings, data} from "../../stores";

	import {onMount} from "svelte";
	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";

	import {Icon} from ".././components";


	import {SERVICES_INFO, DEFAULT_SETTINGS, SETTINGS_TABS, AVAILABLE_SERVICES} from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {
		GeneralSettings,
		AppearanceSettings,
		DetectorSettings,
		TranslatorSettings,
		FunctionalitySettings
	} from "./settings-tabs";

	export let plugin: TranslatorPlugin;

	let bergamot_update_available = false;
	let tab = $data.tab;
	let tab_idx = SETTINGS_TABS.findIndex(t => t.id === tab);

	let translator: DummyTranslate;

	function getComponent() {
		switch (tab) {
			case "general":
				return GeneralSettings;
			case "functionality":
				return FunctionalitySettings;
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
