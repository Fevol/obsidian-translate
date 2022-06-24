import {ItemView, Scope, WorkspaceLeaf} from "obsidian";
import type {KeymapEventHandler} from "obsidian";
import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {TRANSLATOR_VIEW_ID} from "./constants";


export class TranslatorView extends ItemView {
	plugin: TranslatorPlugin;
	scope: Scope;
	private view: SvelteComponent;
	shortcut: KeymapEventHandler;

	constructor(leaf: WorkspaceLeaf, plugin: TranslatorPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.scope = new Scope(this.app.scope);
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
		this.shortcut = this.scope.register(['Mod'], 'Enter', () => {});
	}

	async onClose() {
		this.view.$destroy();
		this.scope.unregister(this.shortcut);
	}

	onResize() {
		const rectangle = this.containerEl.getBoundingClientRect();
		this.view.onResize(rectangle.width, rectangle.height);
	}
}
