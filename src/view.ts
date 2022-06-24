import {ItemView, Scope, WorkspaceLeaf} from "obsidian";
import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {TRANSLATOR_VIEW_ID} from "./constants";


export class TranslatorView extends ItemView {
	plugin: TranslatorPlugin;
	private view: SvelteComponent;
	scope: Scope;
	in: Element;
	out: Element;

	constructor(leaf: WorkspaceLeaf, plugin: TranslatorPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.scope = new Scope(app.scope)
		this.scope.register(['Mod'], 'Enter', (e) => {
			this.view.translate();
			return false;
		});
	}

	push() {
		app.keymap.pushScope(this.scope);
	}
	pop() {
		app.keymap.popScope(this.scope);
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
		this.in = containerEl.getElementsByClassName('translator-textarea')[0]
		this.in.addEventListener('mouseenter', () => this.push())
		this.out = containerEl.getElementsByClassName('translator-textarea')[0]
		this.out.addEventListener('mouseout', () => this.pop())
	}

	async onClose() {
		this.view.$destroy();
		this.pop()
		this.containerEl.detach()
	}

	onResize() {
		const rectangle = this.containerEl.getBoundingClientRect();
		this.view.onResize(rectangle.width, rectangle.height);
	}
}
