import { Modal } from "obsidian";
import type { SvelteComponent } from "svelte";
import type TranslatorPlugin from "../../main";
import PasswordRequestModalView from "./PasswordRequestModalView.svelte";

export default class PasswordModal extends Modal {
	private view?: SvelteComponent;

	constructor(public plugin: TranslatorPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	async onOpen() {
		this.view = new PasswordRequestModalView({
			target: this.contentEl,
			props: {
				plugin: this.plugin,
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
