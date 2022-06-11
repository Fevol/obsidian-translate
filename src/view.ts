import {ItemView, WorkspaceLeaf, App, setIcon, Notice} from "obsidian";
import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {ICONS, TRANSLATOR_VIEW_ID, TRANSLATION_SERVICES_INFO} from "./constants";
import type {APIServiceProviders} from "./types";


export class TranslatorView extends ItemView {
	app: App;
	plugin: TranslatorPlugin;
	view: SvelteComponent;

	constructor(leaf: WorkspaceLeaf, app: App, plugin: TranslatorPlugin) {
		super(leaf);
		this.app = app;
		this.plugin = plugin;
	}

	getViewType() {
		return TRANSLATOR_VIEW_ID;
	}

	getDisplayText() {
		return "Translator";
	}

	getIcon(): string {
		return "translate";
	}


	async onOpen() {
		const {containerEl} = this;
		containerEl.empty();

		this.view = new ViewPage({
			target: containerEl,
			props: {
				plugin: this.plugin,
				settings: this.plugin.settings,
				data: this.plugin.plugin_data,
			}
		});

	}

	async onClose() {
		this.view.$destroy();
	}

}
