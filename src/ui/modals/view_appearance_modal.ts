import { Modal, App } from "obsidian";
import type {SvelteComponent} from "svelte"
import ViewAppearanceModalView from "./ViewAppearanceModalView.svelte";
import type {TranslatorView} from "../../view";

export default class ViewAppearanceModal extends Modal {
	private view: SvelteComponent;
	translator_view: TranslatorView;


	constructor(app: App, translator_view: TranslatorView) {
		super(app);
		this.translator_view = translator_view;
		this.titleEl.innerText = "Alter translation view appearance";
	}

	async onOpen() {
		const state = this.translator_view.getState();

		state.left_buttons = state.left_buttons.map((button: any) => {
			button.id = button.id + `_${Math.random() * 1000}`;
			return button;
		});
		state.right_buttons = state.right_buttons.map((button: any) => {
			button.id = button.id + `_${Math.random() * 1000}`;
			return button;
		});

		this.view = new ViewAppearanceModalView({
			target: this.contentEl,
			props: state,
		});
		this.view.$on("close", async (e) => {
			e.detail.left_buttons = e.detail.left_buttons.map((button: any) => {
				button.id = button.id.split("_")[0];
				return button;
			})
			e.detail.right_buttons = e.detail.right_buttons.map((button: any) => {
				button.id = button.id.split("_")[0];
				return button;
			});


			await this.translator_view.setState(Object.assign(state, e.detail), {});
			super.close();
		});

	}

	onClose() {
		this.view.$destroy();
	}
}
