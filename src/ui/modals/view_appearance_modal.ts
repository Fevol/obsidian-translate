import { App, Modal } from "obsidian";
import type { SvelteComponent } from "svelte";
import { QUICK_ACTIONS, QUICK_SETTINGS } from "../../constants";
import { generateIdentifier } from "../../util";
import type { TranslatorView } from "../../view";
import ViewAppearanceModalView from "./ViewAppearanceModalView.svelte";

export default class ViewAppearanceModal extends Modal {
	private view?: SvelteComponent;

	constructor(app: App, public translator_view: TranslatorView) {
		super(app);
		this.translator_view = translator_view;
		this.titleEl.innerText = "Alter translation view appearance";
	}

	async onOpen() {
		const state = this.translator_view.getState();

		state.top_buttons = state.top_buttons.map((button: any) => {
			return {
				id: button + `_${generateIdentifier()}`,
				...QUICK_SETTINGS[button as keyof typeof QUICK_SETTINGS],
			};
		});
		state.left_buttons = state.left_buttons.map((button: any) => {
			return {
				id: button + `_${generateIdentifier()}`,
				...QUICK_ACTIONS[button as keyof typeof QUICK_ACTIONS],
			};
		});
		state.right_buttons = state.right_buttons.map((button: any) => {
			return {
				id: button + `_${generateIdentifier()}`,
				...QUICK_ACTIONS[button as keyof typeof QUICK_ACTIONS],
			};
		});

		this.view = new ViewAppearanceModalView({
			target: this.contentEl,
			props: state,
		});
		this.view.$on("close", async (e) => {
			if (e.detail) {
				e.detail.top_buttons = e.detail.top_buttons.map((button: any) => button.id.split("_")[0]);
				e.detail.left_buttons = e.detail.left_buttons.map((button: any) => button.id.split("_")[0]);
				e.detail.right_buttons = e.detail.right_buttons.map((button: any) => button.id.split("_")[0]);

				await this.translator_view.setState(Object.assign(state, e.detail), { history: false });
			}

			super.close();
		});
	}

	onClose() {
		this.view?.$destroy();
	}
}
