import {ItemView, WorkspaceLeaf} from "obsidian";
import type {ViewStateResult} from "obsidian";

import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {TRANSLATOR_VIEW_ID, SERVICES_INFO} from "./constants";
import {get} from "svelte/store";


export class TranslatorView extends ItemView {
	plugin: TranslatorPlugin;
	private view: SvelteComponent;

	language_from: string;
	language_to: string;
	translation_service: string = 'google_translate';
	auto_translate: boolean;
	view_mode: number = 0;
	filter_mode: number = 0;

	// TODO: navigation causes notes to be replaced
	// navigation = true;

	constructor(leaf: WorkspaceLeaf, plugin: TranslatorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return TRANSLATOR_VIEW_ID;
	}

	getDisplayText() {
		return `Translator (${SERVICES_INFO[this.translation_service].display_name})`;
	}

	getIcon(): string {
		return "translate";
	}


	async onOpen() {
		// @ts-ignore (Leaf always has ID)
		this.contentEl.id = this.leaf.id;

		this.view = new ViewPage({
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				settings: this.plugin.settings,
				data: this.plugin.plugin_data,

				id: this.contentEl.id,

				language_from: this.language_from,
				language_to: this.language_to,
				translation_service: this.translation_service,
				auto_translate: this.auto_translate,
				view_mode: this.view_mode,
				filter_mode: this.filter_mode,
			}
		});

		this.contentEl.style.display = "flex";
		this.contentEl.style.flexDirection = "column";
	}

	getState(): any {
		let state = super.getState();

		state.language_from = this.view.$$.ctx[this.view.$$.props.language_from];
		state.language_to = this.view.$$.ctx[this.view.$$.props.language_to];
		state.translation_service = this.view.$$.ctx[this.view.$$.props.translation_service];
		state.auto_translate = this.view.$$.ctx[this.view.$$.props.auto_translate];
		state.view_mode = this.view.$$.ctx[this.view.$$.props.view_mode];
		state.filter_mode = this.view.$$.ctx[this.view.$$.props.filter_mode];

		return state;
	}

	async updateState(props: any) {
		this.view.$set(props);
	}

	async setState(state: any, result: ViewStateResult): Promise<void> {
		this.view.$set({
			language_from: state.language_from,
			language_to: state.language_to,
			translation_service: state.translation_service || get(this.plugin.settings).translation_service,
			auto_translate: state.auto_translate || false,
			view_mode: state.view_mode || 0,
			filter_mode: state.filter_mode || 0,
		});

		await super.setState(state, result);
	}

	async onClose() {
		this.view.$destroy();
		this.containerEl.detach()
	}

	onResize() {
		const rectangle = this.contentEl.getBoundingClientRect();
		this.view.onResize(rectangle.width, rectangle.height);
	}
}
