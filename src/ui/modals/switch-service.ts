import { FuzzySuggestModal, App } from "obsidian";
import type TranslatorPlugin from "main";
import {SERVICES_INFO} from "../../constants";
import {available_translator_services} from "../../stores";
import {get} from "svelte/store";

export default class SwitchService extends FuzzySuggestModal<string>{
	plugin: TranslatorPlugin;
	options: Record<string, string>[];
	callback: (service: string) => void;

	constructor(app: App, plugin: TranslatorPlugin, callback: (service: string) => void) {
		super(app);
		this.plugin = plugin;

		this.options = get(available_translator_services)
				.map(service => { return {'value': service, 'label': SERVICES_INFO[service].display_name} })
				.sort((a, b) => a.label.localeCompare(b.label));


		this.setPlaceholder("Select a translation service");
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
