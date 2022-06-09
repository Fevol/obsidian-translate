import {App, PluginSettingTab} from "obsidian";
import type TranslatorPlugin from "./main";
import type {SvelteComponent} from "svelte";
import SettingsPage from "./ui/SettingsPage.svelte";


export class TranslatorSettingsTab extends PluginSettingTab {
	plugin: TranslatorPlugin;
	view: SvelteComponent;

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		this.view = new SettingsPage({
			target: containerEl,
			props: {
				plugin: this.plugin,
				settings: this.plugin.settings,
				data: this.plugin.plugin_data,
			}
		});
	}

	hide(): any {
		super.hide();
		this.view.$destroy();
	}
}

