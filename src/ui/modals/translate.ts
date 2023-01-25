import {FuzzySuggestModal, App, MarkdownView, Editor, TFile} from "obsidian";
import type TranslatorPlugin from "main";
import {get} from "svelte/store";
import {translate_file, translate_selection} from "../../helpers";
import {settings, available_languages, all_languages} from "../../stores";
import type {TranslatorPluginSettings} from "../../types";
import type {TranslationResult} from "../../handlers/types";

export default class TranslateModal extends FuzzySuggestModal<string>{
	plugin: TranslatorPlugin;
	options: Record<string, string>[];
	translation_type: string;
	file: TFile;
	settings: TranslatorPluginSettings;

	// FIXME?: Pass the editor context if provided
	constructor(app: App, plugin: TranslatorPlugin, translation_type: string, file: TFile = null) {
		super(app);
		this.plugin = plugin;
		this.translation_type = translation_type;
		this.file = file;
		const loaded_available_languages = get(available_languages);
		const loaded_all_languages = get(all_languages);
		this.settings = get(settings);



		this.options = Array.from(loaded_available_languages).map(locale => {
			return {
				value: locale,
				label: loaded_all_languages.get(locale),
			}
		}).sort((a, b) => {
			return a.label.localeCompare(b.label)
		});

		let pinned_languages: string[] = [];
		if (this.settings.target_language_preference === "last") {
			pinned_languages = this.settings.last_used_target_languages;
		} else if (this.settings.target_language_preference === "specific") {
			pinned_languages = [this.settings.default_target_language];
		} else if (this.settings.target_language_preference === "display") {
			pinned_languages = [this.plugin.current_language];
		}
		pinned_languages = pinned_languages.filter(x => loaded_available_languages.contains(x));
		let top_languages = pinned_languages.map(x => {
			return {
				value: x,
				label: loaded_all_languages.get(x),
			}
		});
		this.options = [...top_languages, ...this.options.filter(x => !pinned_languages.contains(x.value))];

		this.setPlaceholder("Translate to...");
	}

	getItems(): any[] {
		return this.options;
	}

	getItemText(item: any): string {
		return item.label;
	}

	async onChooseItem(item: any): Promise<void> {
		let output: TranslationResult;
		if (this.translation_type.contains("file")) {
			output = await translate_file(this.plugin, this.file || this.app.workspace.getActiveFile(), item.value,
				this.translation_type === "file-current", {
					apply_glossary: this.settings.apply_glossary
				});
		} else if (this.translation_type === "selection") {
			let editor: Editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
			output = await translate_selection(this.plugin, editor, item.value, {
				apply_glossary: this.settings.apply_glossary
			});
		}

		if (output.status_code === 200) {
			settings.update((x: TranslatorPluginSettings) => {
				if (!x.last_used_target_languages.contains(item.value)) {
					x.last_used_target_languages = [item.value, ...x.last_used_target_languages].slice(0, 3);
				} else {
					x.last_used_target_languages = x.last_used_target_languages.filter(x => x !== item.value);
					x.last_used_target_languages = [item.value, ...x.last_used_target_languages];
				}
				return x;
			});
		} else if (output.message) {
			this.plugin.message_queue(output.message)
		}
	}
}
