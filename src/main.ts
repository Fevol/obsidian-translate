import { addIcon, Editor, MarkdownView, Notice, Plugin, setIcon, Platform, requireApiVersion } from 'obsidian';

import {writable, type Writable, get} from "svelte/store";
import {Reactivity, ViewPage} from "./ui/translator-components";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";
import {SwitchService, TranslateModal} from "./ui/modals";

import type {
	APIServiceProviders,
	APIServiceSettings, DetectionResult,
	PluginData,
	TranslatorPluginSettings
} from "./types";
import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, DEFAULT_DATA} from "./constants";
import type {DummyTranslate} from "./handlers";
import {nested_object_assign, rateLimit} from "./util";

import ISO6391 from "iso-639-1";
import {detect_selection, translate_selection} from "./helpers";

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
	detector: DummyTranslate;

	// Ensures that none of those annoying 'Translation service is not validated' messages are shown while changing settings
	settings_open: boolean = false;

	// Limit queue to only run one message of translator plugin at a time (limitCount 0 means that none of the proceeding messages will be queued)
	message_queue: ((...args: any[]) => void)

	async onload() {
		this.message_queue = rateLimit(5, 3000, true,(text: string, timeout: number = 4000, priority: boolean = false) => {
			new Notice(text, timeout);
		});

		this.plugin_data = writable<PluginData>(Object.assign({}, DEFAULT_DATA, {models:  JSON.parse(localStorage.getItem('models')) || {}}));


		let loaded_settings: TranslatorPluginSettings = await this.loadData();
		const translation_service = loaded_settings?.translation_service || DEFAULT_SETTINGS.translation_service;

		// Translation services should only be added to the data.json if the user wants to use it
		// Settings keys that may only be updated if they exist
		const set_if_exists = Object.keys(TRANSLATION_SERVICES_INFO).filter(key => translation_service !== key);

		// Adds newly introduced settings to the data.json if they're not already there, this ensures that older settings
		// are forwards compatible with newer versions of the plugin
		loaded_settings = nested_object_assign(DEFAULT_SETTINGS, loaded_settings ? loaded_settings : {}, new Set(set_if_exists));

		// Check for any updates on the translation services
		// In order to improve future compatibility, the user can manually update the available_languages/... with
		//    the 'update languages' button in the settings (and thus fetch a more recent version than default);
		//    these settings may not be overwritten by the plugin
		for (const [key, value] of Object.entries(loaded_settings.service_settings as APIServiceProviders)) {
			// @ts-ignore (key is also keyof service_settings)
			if (value.version < DEFAULT_SETTINGS.service_settings[key].version) {
				// @ts-ignore (because this should never crash, and can't get add keyof APIServiceProvider to LHS)
				loaded_settings.service_settings[key].available_languages = DEFAULT_SETTINGS.service_settings[key].available_languages;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].downloadable_models = DEFAULT_SETTINGS.service_settings[key].downloadable_models;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].version = DEFAULT_SETTINGS.service_settings[key].version;
			}
		}

		this.settings = writable<TranslatorPluginSettings>(loaded_settings);


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

		const commands: Array<CommandI> = [
			{
				id: "translator-open-view",
				name: "Open translation view",
				icon: "translate",
				func: () => {this.activateTranslatorView()}
			},
			{
				id: "translator-change-service",
				name: "Change Translator Service",
				icon: "cloud",
				func: () => {new SwitchService(this.app, this).open()}
			},
			{
				id: "translator-to-new-file",
				name: "File to selected language (new file)",
				icon: "translate-file-new",
				editor_context: true,
				func: () => {new TranslateModal(this.app, this, "file-new").open()}
			},

			{
				id: "translator-to-curr-file",
				name: "File to selected language (current file)",
				icon: "translate-file-new",
				editor_context: true,
				func: () => {new TranslateModal(this.app, this, "file-current").open()}
			},
			{
				id: "translator-selection",
				name: "Selection to selected language",
				icon: "translate-selection-filled",
				editor_context: true,
				func: () => {new TranslateModal(this.app, this, "selection").open()}
			},
			{
				id: "translator-detection",
				name: "Detect language of selection",
				icon: "detect-selection",
				editor_context: true,
				func: async (editor: Editor, view: MarkdownView) => {
					await detect_selection(this, editor);
				},
			}
		]
		interface CommandI {
			id: string,
			name: string,
			icon: string,
			editor_context?: boolean
			func?: any,
		}

		for (let command of commands) {
			delete Object.assign(command, {[(Platform.isMobile || command.editor_context) ? "editorCallback" : "callback"]: command["func"] })["func"];
			this.addCommand(command);
		}


		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				if (this.translator && this.translator.valid) {
					menu.addItem((item) => {
						item.setTitle("Translate")
							.setIcon("translate")
							.onClick(async () => {
								// Keep the dropdown open
							});

						if (requireApiVersion("0.15.3"))
							item.setSection("translate")

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
				}

				if (this.translator?.has_autodetect_capability()) {
					menu.addItem((item) => {
						item.setTitle("Detect Language")
							.setIcon("detect-selection")
							.onClick(async () => {
								await detect_selection(this, editor);
							});

						if (requireApiVersion("0.15.3"))
							item.setSection("translate")
					});
				}
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

	async saveSettings(updatedSettings: any) {
		await this.saveData(updatedSettings);
	}

	// async savePartialSettings(changedOptions: (settings: TranslatorPluginSettings) => Partial<TranslatorPluginSettings>) {
	// 	this.settings = Object.assign({}, this.settings, changedOptions(this.settings));
	// 	await this.saveData(this.settings);
	// }

	// ---------------------------------------------------------------
}
