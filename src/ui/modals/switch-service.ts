import { FuzzySuggestModal, App } from "obsidian";
import type TranslatorPlugin from "src/main";
import {DEFAULT_SETTINGS, SERVICES_INFO} from "../../constants";

export default class SwitchService extends FuzzySuggestModal<string>{
	plugin: TranslatorPlugin;
	options: Record<string, string>[];
	callback: (service: string) => void;

	constructor(app: App, plugin: TranslatorPlugin, callback: (service: string) => void) {
		super(app);
		this.plugin = plugin;
		this.options = Array.from(Object.entries(SERVICES_INFO)
			.filter(([service, info]) => info.type === "translation")
			.map(([key, value]) => ({
				value: key,
				label: value.display_name,
			})));
		this.setPlaceholder("Choose a Translation Service");
		this.callback = callback;
	}

	getItems(): any[] {
		return this.options;
	}

	getItemText(item: any): string {
		return item.label;
	}

	async onChooseItem(item: any): Promise<void> {
		this.callback(item.value);
		this.close();
	}

}
