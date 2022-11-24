import {ItemView, Platform, setIcon, WorkspaceLeaf} from "obsidian";
import type {ViewStateResult} from "obsidian";

import type TranslatorPlugin from "./main";

import type {SvelteComponent} from "svelte";
import {ViewPage} from "./ui/translator-components";

import {writable, type Writable} from "svelte/store";
import {settings} from "./stores";
import {get} from "svelte/store";


import {TRANSLATOR_VIEW_ID, SERVICES_INFO} from "./constants";
import {ViewAppearanceModal} from "./ui/modals";
import ViewFunctionalityModal from "./ui/modals/view_functionality_modal";


export class TranslatorView extends ItemView {
	plugin: TranslatorPlugin;
	view: SvelteComponent;

	translation_service: Writable<string> = writable("dummy");

	// TODO: navigation causes notes to be replaced
	// navigation = true;

	constructor(leaf: WorkspaceLeaf, plugin: TranslatorPlugin) {
		super(leaf);
		this.plugin = plugin;

		this.addAction('palette', "Change the view's appearance", () => {
			new ViewAppearanceModal(app, this).open();
		});

		this.addAction('wrench', "Alter the view's functionality", () => {
			new ViewFunctionalityModal(app, this).open();
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
		this.contentEl.style.display = "flex";
		this.contentEl.style.flexDirection = "column";
	}

	getState(): any {
		let state = super.getState();
		if (this.view) {
			state.language_from = this.view.$$.ctx[this.view.$$.props.language_from];
			state.language_to = this.view.$$.ctx[this.view.$$.props.language_to];
			state.translation_service = get(this.translation_service);
			state.auto_translate = this.view.$$.ctx[this.view.$$.props.auto_translate];
			state.apply_glossary = this.view.$$.ctx[this.view.$$.props.apply_glossary];
			state.view_mode = this.view.$$.ctx[this.view.$$.props.view_mode];
			state.filter_mode = this.view.$$.ctx[this.view.$$.props.filter_mode];
			state.show_attribution = this.view.$$.ctx[this.view.$$.props.show_attribution];
			state.top_buttons = this.view.$$.ctx[this.view.$$.props.top_buttons];
			state.left_buttons = this.view.$$.ctx[this.view.$$.props.left_buttons];
			state.right_buttons = this.view.$$.ctx[this.view.$$.props.right_buttons];
		}
		return state;
	}

	async updateState(props: any) {
		this.view.$set(props);
	}

	async setState(state: any, result: ViewStateResult): Promise<void> {
		const current_settings = get(settings);

		if (!this.view) {
			this.translation_service.subscribe((value) => {
				setIcon(this.leaf.tabHeaderInnerIconEl, value);

				const title = SERVICES_INFO[value].display_name;
				this.leaf.tabHeaderEl.ariaLabel = title;
				this.leaf.tabHeaderInnerTitleEl.innerText = title;
				this.leaf.view.titleEl.innerText = title;
			});

			this.translation_service.set(state.translation_service || current_settings.translation_service);

			this.view = new ViewPage({
				target: this.contentEl,
				props: {
					plugin: this.plugin,
					id: this.contentEl.id,
					translation_service: this.translation_service,

					language_from: state.language_from || current_settings.default_source_language,
					language_to: state.language_to || current_settings.default_target_language,
					auto_translate: state.auto_translate || false,
					apply_glossary: state.apply_glossary || false,
					view_mode: !(state.view_mode == null) ? state.view_mode : current_settings.layout_default,
					filter_mode: state.filter_mode || 0,
					show_attribution: !(state.show_attribution == null) ? state.show_attribution : current_settings.hide_attribution_default,
					top_buttons: !(state.top_buttons == null) ? state.top_buttons : [...current_settings.quicksettings_default],
					left_buttons: !(state.left_buttons == null) ? state.left_buttons : [...current_settings.left_quickactions_default],
					right_buttons: !(state.right_buttons == null) ? state.right_buttons : [...current_settings.right_quickactions_default],
				}
			});
		} else {
			this.translation_service.set(state.translation_service || current_settings.translation_service);

			// Called whenever state get changed via appearance modal changes:
			// necessary because view_appearance.ts and view.ts/ViewPage.svelte cannot directly communicate
			this.view.$set({
				language_from: state.language_from || current_settings.default_source_language,
				language_to: state.language_to || current_settings.default_target_language,
				auto_translate: state.auto_translate || false,
				apply_glossary: state.apply_glossary || false,
				view_mode: state.view_mode || 0,
				filter_mode: state.filter_mode || 0,
				show_attribution: state.show_attribution !== undefined ? state.show_attribution : true,
				top_buttons: state.top_buttons || [],
				left_buttons: state.left_buttons || [],
				right_buttons: state.right_buttons || [],
			});
		}

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
