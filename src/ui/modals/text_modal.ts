import { Modal } from "obsidian";
import type {SvelteComponent} from "svelte"
import TextModalView from "./TextModalView.svelte";

import type TranslatorPlugin from "../../main";

export default class TextModal extends Modal {
	private view?: SvelteComponent;

	constructor(public plugin: TranslatorPlugin, public title: string, public description: string) {
		super(plugin.app);
		this.title = title;
		this.description = description;
	}

	async onOpen() {
		this.view = new TextModalView({
			target: this.contentEl,
			props: {
				title: this.title,
				description: this.description,
			}
		});
	}

	onClose() {
		this.view?.$destroy();
	}
}
