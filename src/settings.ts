import {App, PluginSettingTab} from "obsidian";
import type TranslatorPlugin from "./main";
import type {SvelteComponent} from "svelte";
import {SettingsPage} from "./ui/pages";


export class TranslatorSettingsTab extends PluginSettingTab {
	plugin: TranslatorPlugin;
	private view!: SvelteComponent;

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.plugin.settings_open = true;

		const {containerEl} = this;
		containerEl.empty();

		this.view = new SettingsPage({
			target: containerEl,
			props: {
				plugin: this.plugin,
			}
		});
	}

	hide(): any {
		super.hide();

		this.plugin.settings_open = false;

		this.view.$destroy();
	}
}

