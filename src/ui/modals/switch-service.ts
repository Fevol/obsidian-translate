import { FuzzySuggestModal, App } from "obsidian";
import type TranslatorPlugin from "src/main";
import {DEFAULT_SETTINGS, TRANSLATION_SERVICES_INFO} from "../../constants";
import type {APIServiceProviders} from "../../types";

export default class SwitchService extends FuzzySuggestModal<string>{
	plugin: TranslatorPlugin;
	options: Record<string, string>[];

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app);
		this.plugin = plugin;
		this.options = Array.from(Object.entries(TRANSLATION_SERVICES_INFO).map(([key, value]) => ({
			value: key,
			label: value.display_name,
		})));
		this.setPlaceholder("Choose a Translation Service");
	}

	getItems(): any[] {
		return this.options;
	}

	getItemText(item: any): string {
		return item.label;
	}

	async onChooseItem(item: any): Promise<void> {
		this.plugin.settings.update(x => {
			x.translation_service = item.value;
			// If translation service data does not exist in settings, add it
			// @ts-ignore (Service will always be index in service_settings)
			if (!x.service_settings[item.value as keyof typeof APIServiceProviders]) {
				// @ts-ignore (Idem)
				x.service_settings[item.value] = DEFAULT_SETTINGS.service_settings[item.value];
			}

			return x;
		});
		this.close();
	}

}
