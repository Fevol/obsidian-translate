import {FuzzySuggestModal, App, MarkdownView, Editor} from "obsidian";
import type TranslatorPlugin from "main";
import {get} from "svelte/store";
import {translate_file, translate_selection} from "../../helpers";

export default class TranslateModal extends FuzzySuggestModal<string>{
	plugin: TranslatorPlugin;
	options: Record<string, string>[];
	translation_type: string;

	// FIXME?: Pass the editor context if provided
	constructor(app: App, plugin: TranslatorPlugin, translation_type: string) {
		super(app);
		this.plugin = plugin;
		this.translation_type = translation_type;
		let data = get(plugin.plugin_data);


		this.options = Array.from(data.available_languages).map(locale => {
			return {
				value: locale,
				label: data.all_languages.get(locale),
			}
		}).sort((a, b) => {
			return a.label.localeCompare(b.label)
		});

		this.setPlaceholder("Translate to...");
	}

	getItems(): any[] {
		return this.options;
	}

	getItemText(item: any): string {
		return item.label;
	}

	async onChooseItem(item: any): Promise<void> {
		if (this.translation_type.contains("file")) {
			await translate_file(this.plugin, this.app.workspace.getActiveFile(), item.value, this.translation_type === "file-current");
		} else if (this.translation_type === "selection") {
			let editor: Editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
			await translate_selection(this.plugin, editor, item.value);
		}

	}

}
