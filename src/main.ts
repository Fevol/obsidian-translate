import {addIcon, Editor, MarkdownView, Notice, Plugin, setIcon, Platform, requireApiVersion, moment} from 'obsidian';

import {writable, type Writable, get} from "svelte/store";
import {settings, data} from "./stores";
import {Reactivity, ViewPage} from "./ui/translator-components";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";
import {SwitchService, TranslateModal} from "./ui/modals";

import {around} from 'monkey-around';

import type {
	APIServiceProviders,
	APIServiceSettings,
	TranslatorPluginSettings
} from "./types";

import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, DEFAULT_DATA, SERVICES_INFO} from "./constants";
import type {DummyTranslate} from "./handlers";
import {nested_object_assign, rateLimit} from "./util";

import ISO6391 from "iso-639-1";
import {detect_selection, translate_selection} from "./helpers";

export default class TranslatorPlugin extends Plugin {
	reactivity: Reactivity;

	current_language: string;
	detected_language: string;
	service_data: APIServiceSettings;

	uninstall: any;

	available_languages: any[] = [];

	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;
	detector: DummyTranslate;

	// Ensures that none of those annoying 'Translation service is not validated' messages are shown while changing settings
	settings_open: boolean = false;

	// Limit queue to only run one message of translator plugin at a time (limitCount 0 means that none of the proceeding messages will be queued)
	message_queue: ((...args: any[]) => void)

	async onload() {
		this.current_language = this.fixLanguageCode(moment.locale());

		// Set up message queue for the plugin, this rate limits the number of messages the plugin can send at the same time,
		// and allows for the messages to be ordered in a certain way
		const default_timeout = 4000;
		this.message_queue = rateLimit(5, 3000, true, default_timeout,(text: string, timeout: number = default_timeout, priority: boolean = false) => {
			new Notice(text, timeout);
		});

		data.set(Object.assign({}, DEFAULT_DATA,  {
			models:  JSON.parse(app.loadLocalStorage('models')) || {},
			password: app.loadLocalStorage('password') || '',
		}));

		let loaded_settings: TranslatorPluginSettings = await this.loadData();
		const translation_service = loaded_settings?.translation_service || DEFAULT_SETTINGS.translation_service;

		// Translation services should only be added to the data.json if the user wants to use it
		// Settings keys that may only be updated if they exist
		const set_if_exists = Object.keys(SERVICES_INFO).filter(key => translation_service !== key);

		// Adds newly introduced settings to the data.json if they're not already there, this ensures that older settings
		// are forwards compatible with newer versions of the plugin
		loaded_settings = nested_object_assign(DEFAULT_SETTINGS, loaded_settings ? loaded_settings : {}, new Set(set_if_exists));

		// (Changed bing_translator -> azure_translator in v1.4.0, this patch will only be here for a couple versions)
		if (loaded_settings.translation_service === 'bing_translator')
			loaded_settings.translation_service = 'azure_translator';
		if (loaded_settings?.service_settings['bing_translator' as keyof APIServiceProviders]) {
			loaded_settings.service_settings['azure_translator'] =
				<APIServiceSettings>loaded_settings.service_settings['bing_translator' as keyof APIServiceProviders];
			loaded_settings.service_settings['bing_translator' as keyof APIServiceProviders] = undefined;
		}


		// Check for any updates on the translation services
		// In order to improve future compatibility, the user can manually update the available_languages/... with
		//    the 'update languages' button in the settings (and thus fetch a more recent version than default);
		//    these settings may not be overwritten by the plugin
		for (const [key, value] of Object.entries(loaded_settings.service_settings as APIServiceProviders)) {
			if (value.version < DEFAULT_SETTINGS.service_settings[key as keyof APIServiceProviders].version) {
				// @ts-ignore (because this should never crash, and can't get add keyof APIServiceProvider to LHS)
				loaded_settings.service_settings[key].available_languages = DEFAULT_SETTINGS.service_settings[key].available_languages;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].downloadable_models = DEFAULT_SETTINGS.service_settings[key].downloadable_models;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].version = DEFAULT_SETTINGS.service_settings[key].version;
			}
		}

		settings.set(loaded_settings);


		// Save all settings on update of this.settings
		this.register(settings.subscribe((settings_data) => {
			this.saveSettings(settings_data);
		}));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// Register the view to the app.
		this.registerView(
			TRANSLATOR_VIEW_ID,
			(leaf) => new TranslatorView(leaf, this)
		);



		// Load icons into Obsidian
		for (const [id, icon] of Object.entries(ICONS))
			addIcon(id, icon);

		this.reactivity = new Reactivity({
			target: document.body,
			props: {
				app: this.app,
				plugin: this,
			}
		});

		this.addRibbonIcon("translate", "Open translation view", async () => {
			await this.activateTranslatorView();
		});

		const commands: Array<CommandI> = [
			{
				id: "translator-open-view",
				name: "Open translation view",
				icon: "translate",
				func: async () => {
					await this.activateTranslatorView();
				}
			},
			{
				id: "translator-change-service",
				name: "Change Translator Service",
				icon: "cloud",
				func: () => {new SwitchService(this.app, this, (service) => {
					this.setTranslationService(service);
				}).open()}
			},
			{
				id: "translator-to-new-file",
				name: "Translate note to selected language (new file)",
				icon: "translate-file-new",
				editor_context: true,
				func: () => {new TranslateModal(this.app, this, "file-new").open()}
			},

			{
				id: "translator-to-curr-file",
				name: "Translate note to selected language (current file)",
				icon: "translate-file-new",
				editor_context: true,
				func: () => {new TranslateModal(this.app, this, "file-current").open()}
			},
			{
				id: "translator-selection",
				name: "Translate selection to selected language",
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
				if (this.translator.has_autodetect_capability()) {
					let plugin_data = get(data);
					if (plugin_data.available_languages.length) {
						menu.addItem((item) => {
							item.setTitle("Translate")
								.setIcon("translate")
								.setDisabled(!this.translator.valid || !editor.getSelection())
								.onClick(async (e) => {
									// @ts-ignore (e.target exists)
									if (e.target.className !== "menu-item") {
										const loaded_settings = get(settings);
										if (loaded_settings.default_target_language && plugin_data.available_languages.includes(loaded_settings.default_target_language))
											await translate_selection(this, editor, loaded_settings.default_target_language);
										else if (plugin_data.available_languages.includes(this.current_language))
											await translate_selection(this, editor, this.current_language);
										else
											return false;
									}
								})
								.setSection("translate")

							const element = (item as any).dom as HTMLElement;
							element.classList.add("translator-dropdown")
							let dropdown_icon = element.createEl("span", {cls: "translator-dropdown-logo"})
							setIcon(dropdown_icon, "chevron-right");


							let dropdown_menu = element.createEl("div", {cls: "menu translator-dropdown-menu"});

							// TODO: Sveltelize this?
							let dropdown_menu_items = Array.from(plugin_data.available_languages)
								.map((locale) => { return [locale, plugin_data.all_languages.get(locale)]; })
								.sort((a, b) => a[1].localeCompare(b[1]));

							for (let [locale, name] of dropdown_menu_items) {
								let dropdown_item = dropdown_menu.createEl("div", {cls: "menu-item", text: name});
								this.registerDomEvent(dropdown_item, "click", async () => {
									await translate_selection(this, editor, locale);
								});
							}
						});
					}

				}

				if (this.translator?.has_autodetect_capability()) {
					menu.addItem((item) => {
						item.setTitle("Detect Language")
							.setIcon("detect-selection")
							.setDisabled(!this.translator.valid || !editor.getSelection())
							.onClick(async () => {
								await detect_selection(this, editor);
							});

						item.setSection("translate")
					});
				}
			})
		);

		this.uninstall = around(app.plugins, {
			uninstallPlugin: (oldMethod) => {
				return async (...args: string[]) => {
					const var_settings = get(settings);
					const result = oldMethod && oldMethod.apply(app.plugins, args);
					if (args[0] === 'obsidian-translate') {
						localStorage.removeItem(`${app.appId}-password`);
						localStorage.removeItem(`${app.appId}-models`);
						if (await app.vault.adapter.exists(`.obsidian/${var_settings.storage_path}`))
							await app.vault.adapter.rmdir(`.obsidian/${var_settings.storage_path}`, true);
					}
				};
			}
		})
	}

	async onunload() {
		this.reactivity.$destroy();
		this.uninstall();
	}

	async activateTranslatorView() {
		const loaded_settings = get(settings);
		const translation_service: string = loaded_settings.translation_service;
		// const available_languages = (loaded_settings.service_settings[translation_service as keyof APIServiceProviders] as APIServiceSettings).available_languages;

		const view_state = {
			type: TRANSLATOR_VIEW_ID,
			active: true,
			state: {
				// language_from: available_languages.includes(loaded_settings.default_source_language) ? loaded_settings.default_source_language : 'auto',
				// language_to: available_languages.includes(loaded_settings.default_source_language) ? loaded_settings.default_source_language : this.current_language,
				language_from: loaded_settings.default_source_language || 'auto',
				language_to: loaded_settings.default_target_language || this.current_language,
				translation_service: translation_service,
			}
		};

		if (this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.getRoot() == this.app.workspace.rootSplit) {
			await this.app.workspace.getLeaf(true, 'vertical').setViewState(view_state)
		} else {
			const right_leaf = this.app.workspace.getRightLeaf(false);

			// Add the translator leaf to the right sidebar
			await right_leaf.setViewState(view_state);

			// Get the translator leaf and reveal it
			this.app.workspace.revealLeaf(right_leaf);
		}
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

	async saveSettings(updatedSettings: any) {
		await this.saveData(updatedSettings);
	}
	// --------------------------------------------------------------



	// A way to change the main translation service via the console, access translator via 'plugin.translator'
	async setTranslationService(service: string) {
		settings.update((x: TranslatorPluginSettings) => {
			x.translation_service = service;
			return x;
		});
	}
}
