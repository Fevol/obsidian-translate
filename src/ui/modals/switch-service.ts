import type TranslatorPlugin from "main";
import { App, FuzzySuggestModal } from "obsidian";
import { get } from "svelte/store";
import { SERVICES_INFO } from "../../constants";
import { available_translator_services } from "../../stores";
import type { TranslatorServiceType } from "../../types";

export default class SwitchService extends FuzzySuggestModal<{ value: TranslatorServiceType; label: string }> {
	plugin: TranslatorPlugin;
	options: { value: TranslatorServiceType; label: string }[];
	callback: (service: TranslatorServiceType) => void;

	constructor(app: App, plugin: TranslatorPlugin, callback: (service: TranslatorServiceType) => void) {
		super(app);
		this.plugin = plugin;

		this.options = get(available_translator_services)
			.map(service => {
				return { "value": service, "label": SERVICES_INFO[service].display_name };
			})
			.sort((a, b) => a.label.localeCompare(b.label));

		this.setPlaceholder("Select a translation service");
		this.callback = callback;
	}

	getItems(): { value: TranslatorServiceType; label: string }[] {
		return this.options;
	}

	getItemText(item: { value: TranslatorServiceType; label: string }): string {
		return item.label;
	}

	async onChooseItem(item: { value: TranslatorServiceType; label: string }): Promise<void> {
		this.callback(item.value);
		this.close();
	}
}
