import { FuzzySuggestModal, App } from "obsidian";
import type TranslatorPlugin from "src/main";
import { TRANSLATION_SERVICES_INFO } from "../../constants";

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
			return x;
		});
		this.close();
	}

}
