<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {available_translator_services, available_detector_services, settings, settings_tab} from "../../stores";

	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";

	import {Icon} from ".././components";


	import {SERVICES_INFO, SETTINGS_TABS, ALL_SERVICES, ALL_TRANSLATOR_SERVICES} from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {
		GeneralSettings,
		AppearanceSettings,
		DetectorSettings,
		TranslatorSettings,
		FunctionalitySettings,
		GlossarySettings,
		HotkeySettings,
	} from "./settings-tabs";
	import {Menu} from "obsidian";

	export let plugin: TranslatorPlugin;

	let tabs = generateTabs();
	let tab_idx = tabs.findIndex(t => t.id === $settings_tab);
	$: $available_translator_services, $available_detector_services, tabs = generateTabs();

	function generateTabs() {
		return [
			...SETTINGS_TABS,
			...$available_translator_services.map(service => ({id: service, name: SERVICES_INFO[service].display_name, icon: service})),
			...$available_detector_services.map(service => ({id: service, name: SERVICES_INFO[service].display_name, icon: service})),
		];
	}

	let translator: DummyTranslate;

	function getComponent() {
		switch ($settings_tab) {
			case "general":
				return GeneralSettings;
			case "functionality":
				return FunctionalitySettings;
			case "glossary":
				return GlossarySettings;
			case "hotkeys":
				return HotkeySettings;
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
		const new_tab = tabs[index].id;

		$settings_tab = new_tab;
	}
</script>

<div class:disable-animations={!$settings.enable_animations}>
	<nav class="translator-navigation-bar" tabindex="0"
		 on:keydown={e => {
			if (e.key === "Tab") {
				// FIXME: Prevent propagation of tab focus changing ONCE
				if (e.metaKey || e.ctrlKey)
					return true;
				else if (e.shiftKey)
					changedTabs((((tab_idx - 1) % tabs.length) + tabs.length) % tabs.length);
				else
					changedTabs((tab_idx + 1) % tabs.length);
				e.preventDefault();
			}
		}}
	>
		{#each tabs as {id, name, icon}, index}
			<div class:translator-navigation-item-selected={$settings_tab === id} class="translator-navigation-item"
				 aria-label={`${name} settings`} on:click={() => {
					 changedTabs(index)}
				 }
				on:contextmenu={e => {
					if (ALL_SERVICES.includes(id)) {
						let menu = new Menu();
						if (ALL_TRANSLATOR_SERVICES.contains(id)) {
							menu.addItem((item) => {
								item.setTitle("Set as default")
									.setIcon("translate")
									.onClick((e) => {
										$settings.translation_service = id
									})
							});
						}
						menu.addItem((item) => {
								item.setTitle("Hide service")
									.setIcon("eye-off")
									.onClick((e) => {
										if (!$settings.filtered_services.length) {
											$settings.filtered_services = ALL_SERVICES.filter(s => s !== id);
										} else {
											$settings.filtered_services = $settings.filtered_services.filter(s => s !== id);
										}
										plugin.reactivity.filterAvailableServices();
										if ($settings_tab === id) {
											tab_idx -= 1;
											$settings_tab = tabs[tab_idx].id;
										}
									})
						});
						menu.showAtMouseEvent(e);
					}
				}}
			>
				<div style="display: flex">
					<Icon icon="{icon}" class={id === $settings.translation_service ? 'translator-selected-element' : ''} />
				</div>
				<div  class="translator-navigation-item-text" class:translator-navigation-selected-item-text={$settings_tab !== id}>{name}</div>
			</div>
		{/each}
	</nav>

	{#key $settings_tab}
		<div in:horizontalSlide={{duration: 400, delay: 400}} out:slide={{duration: 400}}>
			<svelte:component this={getComponent()}
				plugin={plugin}
				settings={settings}
				service={$settings_tab}
			/>
		</div>
	{/key}
</div>
