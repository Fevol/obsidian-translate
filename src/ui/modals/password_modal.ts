import { Modal, App } from "obsidian";
import type {SvelteComponent} from "svelte"
import PasswordModalView from "./PasswordModalView.svelte";
import type TranslatorPlugin from "../../main";

export default class PasswordModal extends Modal {
	private view: SvelteComponent;
	plugin: TranslatorPlugin;

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app);
		this.plugin = plugin;
		this.titleEl.innerText = "Set new password";
	}

	async onOpen() {
		this.view = new PasswordModalView({
			target: this.contentEl,
			props: {
				settings: this.plugin.settings,
			}
		});
		this.view.$on("close", async (e) => {
			super.close();
		});

	}

	onClose() {
		this.view.$destroy();
	}
}
