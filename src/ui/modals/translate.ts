import {FuzzySuggestModal, App, MarkdownView, Editor, TFile} from "obsidian";
import type TranslatorPlugin from "main";
import {get} from "svelte/store";
import {translate_file, translate_selection} from "../../helpers";
import {data, settings} from "../../stores";

export default class TranslateModal extends FuzzySuggestModal<string>{
	plugin: TranslatorPlugin;
	options: Record<string, string>[];
	translation_type: string;
	file: TFile;

	// FIXME?: Pass the editor context if provided
	constructor(app: App, plugin: TranslatorPlugin, translation_type: string, file: TFile = null) {
		super(app);
		this.plugin = plugin;
		this.translation_type = translation_type;
		this.file = file;
		const plugin_data = get(data);

		this.options = Array.from(plugin_data.available_languages).map(locale => {
			return {
				value: locale,
				label: plugin_data.all_languages.get(locale),
			}
		}).sort((a, b) => {
			return a.label.localeCompare(b.label)
		});

		const filled_settings = get(settings);
		let idx = -1;
		if (filled_settings.default_target_language)
			idx = this.options.findIndex(item => item.value === filled_settings.default_target_language);
		if (idx === -1)
			idx = this.options.findIndex(item => item.value === plugin.current_language);
		if (idx !== -1)
			this.options.unshift(this.options.splice(idx, 1)[0]);



		this.setPlaceholder("Translate to...");
	}

	getItems(): any[] {
		return this.options;
	}

	getItemText(item: any): string {
		return item.label;
	}

	async onChooseItem(item: any): Promise<void> {
		// FIXME: I dislike this, a lot. Can't I just store local_glossary as a global variable in stores.ts
		//  and update it directly in Reactivity onMount or whenever its value is being changed? Is that not more efficient?
		const apply_glossary = get(settings).local_glossary;

		if (this.translation_type.contains("file")) {
			await translate_file(this.plugin, this.file || this.app.workspace.getActiveFile(), item.value, this.translation_type === "file-current", apply_glossary);
		} else if (this.translation_type === "selection") {
			let editor: Editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
			await translate_selection(this.plugin, editor, item.value, apply_glossary);
		}

	}

}
