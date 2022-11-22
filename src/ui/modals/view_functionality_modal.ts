import { Modal, App } from "obsidian";
import type {SvelteComponent} from "svelte"
import ViewFunctionalityModalView from "./ViewFunctionalityModalView.svelte";
import type {TranslatorView} from "../../view";

export default class ViewFunctionalityModal extends Modal {
	private view: SvelteComponent;
	translator_view: TranslatorView;


	constructor(app: App, translator_view: TranslatorView) {
		super(app);
		this.translator_view = translator_view;
		this.titleEl.innerText = "Alter translation view functionality";
	}

	async onOpen() {
		const state = this.translator_view.getState();

		this.view = new ViewFunctionalityModalView({
			target: this.contentEl,
			props: state,
		});
		this.view.$on("close", async (e) => {
			if (e.detail)
				await this.translator_view.setState(Object.assign(state, e.detail), {});
			super.close();
		});

	}

	onClose() {
		this.view.$destroy();
	}
}
