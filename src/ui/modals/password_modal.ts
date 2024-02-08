import { Modal, App } from "obsidian";
import type {SvelteComponent} from "svelte"
import PasswordModalView from "./PasswordModalView.svelte";
import type TranslatorPlugin from "../../main";

export default class PasswordModal extends Modal {
	private view?: SvelteComponent;

	constructor(app: App, public plugin: TranslatorPlugin) {
		super(app);
		this.titleEl.innerText = "Set new password";
	}

	async onOpen() {
		this.view = new PasswordModalView({
			target: this.contentEl,
			props: {
				plugin: this.plugin,
			}
		});
		this.view.$on("close", async (e) => {
			super.close();
		});

	}

	onClose() {
		this.view?.$destroy();
	}
}
