<script lang="ts">
	import TranslatorPlugin from "../../main";

	import {settings, data} from "../../stores";

	import {onMount} from "svelte";
	import {slide} from "svelte/transition";
	import {horizontalSlide} from "../animations";

	import {Icon} from ".././components";


	import {SERVICES_INFO, DEFAULT_SETTINGS, SETTINGS_TABS, ALL_SERVICES} from "../../constants";
	import {DummyTranslate} from "../../handlers";

	import {
		GeneralSettings,
		AppearanceSettings,
		DetectorSettings,
		TranslatorSettings,
		FunctionalitySettings,
		// GlossarySettings,
		HotkeySettings,
	} from "./settings-tabs";
	import {Menu} from "obsidian";

	export let plugin: TranslatorPlugin;

	let bergamot_update_available = false;
	let available_services_observer = $data.available_services.length;

	let tab = $data.tab;
	let tabs = generateTabs();
	let tab_idx = tabs.findIndex(t => t.id === tab);
	$: {
		available_services_observer;
		tabs = generateTabs();
	}

	function generateTabs() {
		return [
			...SETTINGS_TABS,
			...$data.available_services.map(service => ({id: service, name: SERVICES_INFO[service].display_name, icon: service})),
			{id: "fasttext", name: "FastText", icon: "fasttext"}
		];
	}

	let translator: DummyTranslate;

	function getComponent() {
		switch (tab) {
			case "general":
				return GeneralSettings;
			case "functionality":
				return FunctionalitySettings;
			// case "glossary":
			// 	return GlossarySettings;
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
					changedTabs((((tab_idx - 1) % tabs.length) + tabs.length) % tabs.length);
				else
					changedTabs((tab_idx + 1) % tabs.length);
				e.preventDefault();
			}
		}}
	>
		{#each tabs as {id, name, icon}, index}
			<div class:translator-navigation-item-selected={tab === id} class="translator-navigation-item"
				 aria-label={`${name} settings`} on:click={() => {
					 changedTabs(index)}
				 }
				on:contextmenu={e => {
					if (ALL_SERVICES.includes(id)) {
						let menu = new Menu();
						menu.addItem((item) => {
							item.setTitle("Set as default")
								.setIcon("translate")
								.onClick((e) => {
									$settings.translation_service = id
								})
						});
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
										if (tab === id) {
											tab_idx -= 1;
											tab = tabs[tab_idx].id;
										}
									})
						});
						menu.showAtMouseEvent(e);
					}
				}}
			>
				<Icon icon="{icon}" size="20" class={id === $settings.translation_service ? 'translator-selected-element' : ''} />
				<div class:translator-navigation-item-text={tab !== id}>{name}</div>
			</div>
		{/each}
	</nav>

	{#key tab}
		<div in:horizontalSlide={{duration: 400, delay: 400}} out:slide={{duration: 400}}>
			<svelte:component this={getComponent()}
				plugin={plugin}
				settings={settings}
				data={data}
				service={tab}
			/>
		</div>
	{/key}
</div>
