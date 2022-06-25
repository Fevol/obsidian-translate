import {addIcon, App, Editor, moment, MarkdownView, Modal, Notice, Plugin, Menu, setIcon} from 'obsidian';

import {writable, type Writable, get} from "svelte/store";
import {Reactivity, ViewPage} from "./ui/translator-components";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";
import {SwitchService, TranslateModal} from "./ui/modals";

import type {APIServiceProviders, APIServiceSettings, PluginData, TranslatorPluginSettings} from "./types";
import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, DEFAULT_DATA} from "./constants";
import type {DummyTranslate} from "./handlers";
import {rateLimit} from "./util";

import ISO6391 from "iso-639-1";
import t from "./l10n";
import {translate_selection} from "./helpers";


export default class TranslatorPlugin extends Plugin {
	settings: Writable<TranslatorPluginSettings>;
	plugin_data: Writable<PluginData>;

	reactivity: Reactivity;
	settings_page: TranslatorSettingsTab;
	view_page: TranslatorView;


	current_language: string;
	detected_language: string;
	service_data: APIServiceSettings;

	available_languages: any[] = [];

	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;

	// Ensures that none of those annoying 'Translation service is not validated' messages are shown while changing settings
	settings_open: boolean = false;

	// Limit queue to only run one message of translator plugin at a time (limitCount 0 means that none of the proceeding messages will be queued)
	message_queue: ((...args: any[]) => void)

	// TODO: Set time interval for translation process to run (to ensure that translations can't overlap)
	// translation_queue = rateLimit(0, 200, async () => {
	// 	await this.view_page.translate();
	// });

	async onload() {
		// TODO: Implement FastText

		this.message_queue = rateLimit(5, 3000, true,(text: string, timeout: number = 4000, priority: boolean = false) => {
			new Notice(text, timeout);
		});

		this.settings = writable<TranslatorPluginSettings>();
		await this.loadSettings();

		this.plugin_data = writable<PluginData>();
		this.plugin_data.set(DEFAULT_DATA);

		// Save all settings on update of this.settings
		this.register(this.settings.subscribe((data) => {
			this.saveSettings(data);
		}));

		// ------------------------  Setup plugin pages  ----------------------
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// Register the view to the app.

		this.registerView(
			TRANSLATOR_VIEW_ID,
			(leaf) => new TranslatorView(leaf, this)
		);

		// --------------------------------------------------------------------


		// ------------------  Load in custom icons  ------------------

		// Load icons into Obsidian
		for (const [id, icon] of Object.entries(ICONS))
			addIcon(id, icon);

		// ------------------------------------------------------------

		this.reactivity = new Reactivity({
			target: document.body,
			props: {
				app: this.app,
				plugin: this,
				settings: this.settings,
				data: this.plugin_data,
			}
		});

		this.addRibbonIcon("translate", "Open translation view", () => {
			this.activateTranslatorView();
		});

		this.addCommand({
			id: "translator-open-view",
			name: "Open translation view",
			icon: "translate",
			editorCallback: () => {
				this.activateTranslatorView();
			},
		});

		this.addCommand({
			id: "translator-change-service",
			name: "Change Translator Service",
			icon: "cloud",
			editorCallback: () => {
				new SwitchService(this.app, this).open();
			},
		});

		this.addCommand({
			id: "translator-to-new-file",
			name: "File to selected language (new file)",
			icon: "translate-file-new",
			editorCallback: () => {
				new TranslateModal(this.app, this, "file-new").open();
			},
		});

		this.addCommand({
			id: "translator-to-curr-file",
			name: "File to selected language (current file)",
			icon: "translate-file",
			editorCallback: () => {
				new TranslateModal(this.app, this, "file-current").open();
			},
		});

		this.addCommand({
			id: "translator-selection",
			name: "Selection to selected language",
			icon: "translate-selection-filled",
			editorCallback: () => {
				new TranslateModal(this.app, this, "selection").open();
			},
		});

		this.addCommand({
			id: "translator-detection",
			name: "Detect language of selection",
			icon: "detect-selection",
			editorCallback: async (editor, view) => {
				let selection = editor.getSelection();
				let results = await this.translator.detect(selection);
				results = results.sort((a, b) => {
					return b.confidence - a.confidence;
				});

				let main = results.shift();

				if (main.message)
					new Notice(main.message, 4000);

				if (main.language) {
					let alternatives = results.map((result) => {
						return `${t(result.language)}` + (result.confidence !== undefined ? ` [${(result.confidence * 100).toFixed(2)}%]` : '');
					}).join("\n\t");

					alternatives = (alternatives ? "\nAlternatives:\n\t" : "") + alternatives;

					new Notice(`Detected language:\n\t${t(main.language)}` +
						(main.confidence !== undefined ? ` [${(main.confidence * 100).toFixed(2)}%]` : '') + alternatives, 0);
				}
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				const item = menu.addItem((item) => {
					item.setTitle("Translate")
						.setIcon("translate")
						.onClick(async () => {
							// Keep the dropdown open
						});
					const element = (item as any).dom as HTMLElement;
					element.classList.add("translator-dropdown")
					let dropdown_icon = element.createEl("span", {cls: "translator-dropdown-logo"})
					setIcon(dropdown_icon, "chevron-right");

					let data = get(this.plugin_data);
					let dropdown_menu = element.createEl("div", {cls: "menu translator-dropdown-menu"});


					// TODO: Sveltelize this?

					let dropdown_menu_items = Array.from(data.available_languages).map((locale) => {
						return [locale, data.all_languages.get(locale)];
					}).sort((a, b) => {
						return a[1].localeCompare(b[1])
					});

					for (let [locale, name] of dropdown_menu_items) {
						let dropdown_item = dropdown_menu.createEl("div", {cls: "menu-item", text: name});
						this.registerDomEvent(dropdown_item, "click", async () => {
							await translate_selection(this, editor, locale);
						});
					}


				});
			})
		);
	}

	async onunload() {
		this.reactivity.$destroy();
	}

	async activateTranslatorView() {
		// Remove existing translator leafs
		this.app.workspace.detachLeavesOfType(TRANSLATOR_VIEW_ID);

		// Add the translator leaf to the right sidebar
		await this.app.workspace.getRightLeaf(false).setViewState({
			type: TRANSLATOR_VIEW_ID,
			active: true,
		});

		// Get the translator leaf and reveal it
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(TRANSLATOR_VIEW_ID)[0]);
	}
	// --------------------------------------------------------------


	// ------------------  Process language codes  ------------------
	fixLanguageCode(code: string) {
		switch (code) {
			case "tam":
				return "ta";
			case "cz":
				return "cs";
			default:
				return code
		}
	}

	// -------------------------------------------------------------


	// --------------------  Settings management  --------------------
	async loadSettings() {
		this.settings.set(Object.assign({}, DEFAULT_SETTINGS, await this.loadData()));
	}


	async saveSettings(updatedSettings: any) {
		await this.saveData(updatedSettings);
	}

	// async savePartialSettings(changedOptions: (settings: TranslatorPluginSettings) => Partial<TranslatorPluginSettings>) {
	// 	this.settings = Object.assign({}, this.settings, changedOptions(this.settings));
	// 	await this.saveData(this.settings);
	// }

	// ---------------------------------------------------------------
}
