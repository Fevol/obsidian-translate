import {ItemView, Platform, setIcon, WorkspaceLeaf} from "obsidian";
import type {ViewStateResult} from "obsidian";

import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {writable, type Writable} from "svelte/store";
import {settings} from "./stores";
import {get} from "svelte/store";


import {TRANSLATOR_VIEW_ID, SERVICES_INFO} from "./constants";
import {ViewAppearanceModalView} from "./ui/modals";


export class TranslatorView extends ItemView {
	plugin: TranslatorPlugin;
	view: SvelteComponent;

	language_from: string;
	language_to: string;
	translation_service: Writable<string> = writable('google_translate');
	auto_translate: boolean;
	view_mode: number = 0;
	filter_mode: number = 0;

	// TODO: navigation causes notes to be replaced
	// navigation = true;

	constructor(leaf: WorkspaceLeaf, plugin: TranslatorPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.translation_service.subscribe((value) => {
			setIcon(this.leaf.tabHeaderInnerIconEl, value);

			const title = SERVICES_INFO[value]?.display_name || 'Translator';
			this.leaf.tabHeaderInnerTitleEl.innerText = title;
			this.leaf.view.titleEl.innerText = title;
		});

		this.addAction('palette', "Change the view's appearance", () => {
			new ViewAppearanceModalView(app, this).open();
		});
	}

	getViewType() {
		return TRANSLATOR_VIEW_ID;
	}

	getDisplayText() {
		return SERVICES_INFO[get(this.translation_service)].display_name;
	}

	getIcon(): string {
		return get(this.translation_service);
	}


	async onOpen() {
		this.contentEl.id = this.leaf.id;
		this.view = new ViewPage({
			target: this.contentEl,
			props: {
				plugin: this.plugin,

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
		state.translation_service = get(this.translation_service);
		state.auto_translate = this.view.$$.ctx[this.view.$$.props.auto_translate];
		state.view_mode = this.view.$$.ctx[this.view.$$.props.view_mode];
		state.filter_mode = this.view.$$.ctx[this.view.$$.props.filter_mode];
		state.show_attribution = this.view.$$.ctx[this.view.$$.props.show_attribution];
		state.left_buttons = this.view.$$.ctx[this.view.$$.props.left_buttons];
		state.right_buttons = this.view.$$.ctx[this.view.$$.props.right_buttons];
		return state;
	}

	async updateState(props: any) {
		this.view.$set(props);
	}

	async setState(state: any, result: ViewStateResult): Promise<void> {
		const current_settings = get(settings);

		this.translation_service.set(state.translation_service || current_settings.translation_service);
		this.view.$set({
			language_from: state.language_from || current_settings.default_source_language,
			language_to: state.language_to || current_settings.default_target_language,
			auto_translate: state.auto_translate || false,
			view_mode: state.view_mode || 0,
			filter_mode: state.filter_mode || 0,
			show_attribution: state.show_attribution !== undefined ? state.show_attribution : true,
			left_buttons: state.left_buttons || [],
			right_buttons: state.right_buttons || [],
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
