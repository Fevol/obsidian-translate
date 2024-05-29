import { Modal } from "obsidian";
import type { SvelteComponent } from "svelte";

import type TranslatorPlugin from "../../main";
import ConfirmationModalView from "./ConfirmationModalView.svelte";

export default class PasswordModal extends Modal {
	private view: SvelteComponent | undefined;
	plugin: TranslatorPlugin;

	callback: () => void;
	title: string;
	description: string;

	constructor(plugin: TranslatorPlugin, title: string, description: string, callback: () => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.title = title;
		this.description = description;
		this.callback = callback;
	}

	async onOpen() {
		this.view = new ConfirmationModalView({
			target: this.contentEl,
			props: {
				callback: this.callback,
				title: this.title,
				description: this.description,
			},
		});
		this.view.$on("close", async (e) => {
			super.close();
		});
	}

	onClose() {
		this.view?.$destroy();
	}
}
