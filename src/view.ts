import {ItemView, WorkspaceLeaf, App, setIcon, Notice} from "obsidian";
import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {ICONS, TRANSLATOR_VIEW_ID, TRANSLATION_SERVICES_INFO} from "./constants";


export class TranslatorView extends ItemView {
	plugin: TranslatorPlugin;
	private view: SvelteComponent;

	constructor(leaf: WorkspaceLeaf, plugin: TranslatorPlugin) {
		super(leaf);
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
		containerEl.id = "translator-view";

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

	onResize() {
		const rectangle = this.containerEl.getBoundingClientRect();
		this.view.onResize(rectangle.width, rectangle.height);
	}
}
