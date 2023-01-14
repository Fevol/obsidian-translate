import {
	addIcon,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	setIcon,
	Platform,
	moment,
	TFile, TFolder
} from 'obsidian';

import {get} from "svelte/store";
import {settings, globals, available_languages, all_languages, fasttext_data, bergamot_data, password} from "./stores";
import {Reactivity} from "./ui/translator-components";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";
import {SwitchService, TranslateModal} from "./ui/modals";

import {around} from 'monkey-around';

import type {
	APIServiceProviders,
	APIServiceSettings, CommandI,
	TranslatorPluginSettings
} from "./types";

import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, SERVICES_INFO} from "./constants";
import type {DummyTranslate} from "./handlers";
import {nested_object_assign, rateLimit} from "./util";

import {detect_selection, translate_selection} from "./helpers";

export default class TranslatorPlugin extends Plugin {

	/**
	 * Svelte component that handles all reactive interactions within the plugin
	 */
	reactivity: Reactivity;

	/**
	 * Current display language of Obsidian
	 */
	current_language: string;

	/**
	 * This is a callback function that will be called on uninstallation of the plugin,
	 * using monkey-around to execute additional code after the Obsidian uninstallation process has finished.
	 */
	uninstall: any;

	/**
	 * Plugin's default (global) translator, is used for all commands (translate file, ...)
	 * @public
	 * */
	translator: DummyTranslate;

	/**
	 * Plugin's default (global) language detector, is used for language detection commands and for glossary language determination
	 * @public
	 */
	detector: DummyTranslate;

	/**
	 * Used to prevent Translation View messages from appearing while settings are being changed
	 */
	settings_open: boolean = false;

	/**
	 * Notice queue for the plugin, it can be configured to only show one message at a time, only show unique messages, etc.
	 * @param limitCount - The number of messages that can be queued at a time, other messages will be discarded
	 * @param interval - The time in milliseconds between each message
	 * @param unique - Whether to only show unique messages (identical content)
	 * @param defaultTimeout - The default time each message will be shown
	 * @param fn - Message constructor: (text: string, timeout?: number, priority?: boolean) => { new Notice }, can be customized
	 */
	message_queue: ((...args: any[]) => void)

	async onload() {
		this.current_language = moment.locale();

		// Set up message queue for the plugin, this rate limits the number of messages the plugin can send at the same time,
		// and allows for the messages to be ordered in a certain way
		const default_timeout = 4000;
		this.message_queue = rateLimit(5, 3000, true, default_timeout, (text: string, timeout: number = default_timeout, priority: boolean = false) => {
			new Notice(text, timeout);
		});


		// TODO: Split up models into fasttext and bergamot data, will only be here for a few versions
		const models_data = app.loadLocalStorage('models');
		if (models_data) {
			localStorage.removeItem(`${app.appId}-models`);
			const models = JSON.parse(models_data) || {};
			fasttext_data.set(models.fasttext || {
				binary: undefined,
				models: undefined,
				version: undefined
			});
			bergamot_data.set(models.bergamot || {
				binary: undefined,
				models: undefined,
				version: undefined
			});
		} else {
			fasttext_data.set(JSON.parse(app.loadLocalStorage('fasttext')) || {
				binary: undefined,
				models: undefined,
				version: undefined
			});
			bergamot_data.set(JSON.parse(app.loadLocalStorage('bergamot')) || {
				binary: undefined,
				models: undefined,
				version: undefined,
			});
		}

		password.set(app.loadLocalStorage('password') || '');


		let loaded_settings: TranslatorPluginSettings = await this.loadData();
		const translation_service = loaded_settings?.translation_service || DEFAULT_SETTINGS.translation_service;

		/** Translation services should only be added to the data.json if the user wants to use it
		 *  set_if_exists will be used in the nested_object_assign function to only add updated service settings
		 *  to loaded_settings
		 */
		const set_if_exists = Object.keys(SERVICES_INFO).filter(key => translation_service !== key);

		/** Adds newly introduced settings to the data.json if they're not already there, this ensures that older settings
		 *  are forwards compatible with newer versions of the plugin
		 */
		loaded_settings = nested_object_assign(DEFAULT_SETTINGS, loaded_settings ? loaded_settings : {}, new Set(set_if_exists));

		// TODO: (Changed bing_translator -> azure_translator in v1.4.0, this patch will only be here for a couple versions)
		if (loaded_settings.translation_service === 'bing_translator')
			loaded_settings.translation_service = 'azure_translator';
		if (loaded_settings?.service_settings['bing_translator' as keyof APIServiceProviders]) {
			loaded_settings.service_settings['azure_translator'] =
				<APIServiceSettings>loaded_settings.service_settings['bing_translator' as keyof APIServiceProviders];
			delete loaded_settings.service_settings['bing_translator' as keyof APIServiceProviders];
		}

		// TODO: (Changed local_glossary --> glossary_preference in v1.4.3, this patch will only be here for a couple versions)
		if (loaded_settings.local_glossary !== undefined) {
			loaded_settings.glossary_preference = loaded_settings.local_glossary ? 'both' : 'online';
			loaded_settings.local_glossary = undefined;
		}


		// @ts-ignore (path exists in legacy versions)
		if (loaded_settings.storage_path) {
			try {
				// @ts-ignore (path exists in legacy versions)
				await app.vault.adapter.rename(`${app.vault.configDir}/${loaded_settings.storage_path}`, `${app.vault.configDir}/plugins/translate/models`);
			} catch (e) {
				console.error(e);
			}
			// @ts-ignore (path exists in legacy versions)
			delete loaded_settings.storage_path;
		}

		/** Check for any updates on the translation services
		 *  In order to improve future compatibility, the user can manually update the available_languages/... with
		 *    the 'update languages' button in the settings (and thus fetch a more recent version than default);
		 *    these settings may not be overwritten by the plugin
		 */
		for (const [key, value] of Object.entries(loaded_settings.service_settings as APIServiceProviders)) {
			if (value.version < DEFAULT_SETTINGS.service_settings[key as keyof APIServiceProviders].version) {
				// @ts-ignore (because this should never crash, and can't get add keyof APIServiceProvider to LHS)
				loaded_settings.service_settings[key].available_languages = DEFAULT_SETTINGS.service_settings[key].available_languages;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].downloadable_models = DEFAULT_SETTINGS.service_settings[key].downloadable_models;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].glossary_languages = DEFAULT_SETTINGS.service_settings[key].glossary_languages;
				// @ts-ignore (idem)
				loaded_settings.service_settings[key].version = DEFAULT_SETTINGS.service_settings[key].version;
			}
		}
		settings.set(loaded_settings);


		// On any change of the settings writable, settings will be saved to the data.json
		this.register(settings.subscribe((settings_data) => {
			this.saveSettings(settings_data);
		}));

		// Register the plugin settings tab
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// Register the Translation View to the app (as a valid workspace)
		this.registerView(
			TRANSLATOR_VIEW_ID,
			(leaf) => new TranslatorView(leaf, this)
		);

		globals.plugin = this;

		// Load custom icons into Obsidian
		for (const [id, icon] of Object.entries(ICONS))
			addIcon(id, icon);

		this.reactivity = new Reactivity({
			target: document.body,
			props: {
				plugin: this,
			}
		});


		this.uninstall = around(app.plugins, {
			uninstallPlugin: (oldMethod) => {
				return async (...args: string[]) => {
					const result = oldMethod && oldMethod.apply(app.plugins, args);
					if (args[0] === 'translate') {
						// Clean up local storage items on uninstallation
						localStorage.removeItem(`${app.appId}-password`);
						localStorage.removeItem(`${app.appId}-fasttext`);
						localStorage.removeItem(`${app.appId}-bergamot`);
						localStorage.removeItem(`${app.appId}-obfuscate_keys`);
						localStorage.removeItem(`${app.appId}-hide_shortcut_tooltips_toggle`);

						const loaded_settings = get(settings);
						if (loaded_settings.security_setting === "local_only") {
							for (const service of Object.keys(SERVICES_INFO)) {
								localStorage.removeItem(`${app.appId}-${service}_api_key`);
							}
						}
					}
				};
			}
		})


		// -------------------------------- Register Commands --------------------------------


		// Potential future plans for URI access, not sure if anyone'd be interested in this
		// this.registerObsidianProtocolHandler("translation-view", async (params) => {
		// 	console.log(params)
		// })

		this.addRibbonIcon("translate", "Open translation view", async () => {
			await this.activateTranslatorView();
		});

		const commands: Array<CommandI> = [
			{
				id: "translator-open-view",
				name: "Open translation view",
				icon: "translate",
				callback: async () => {
					await this.activateTranslatorView();
				},
			},
			{
				id: "translator-change-service",
				name: "Change Translator Service",
				icon: "cloud",
				callback: () => {
					new SwitchService(this.app, this, (service) => {
						this.setTranslationService(service);
					}).open()
				}
			},
			{
				id: "translator-to-new-file",
				name: "Translate note to new file",
				icon: "translate-file-new",
				editor_context: true,
				callback: () => {
					new TranslateModal(this.app, this, "file-new").open()
				}
			},

			{
				id: "translator-to-curr-file",
				name: "Translate note and replace current file",
				icon: "translate-file-new",
				editor_context: true,
				callback: () => {
					new TranslateModal(this.app, this, "file-current").open()
				}
			},
			{
				id: "translator-selection",
				name: "Translate selection (choose language)",
				icon: "translate-selection-filled",
				editor_context: true,
				callback: () => {
					new TranslateModal(this.app, this, "selection").open()
				}
			},
			{
				id: "translator-selection-default",
				name: "Translate selection (default language)",
				icon: "translate-selection-filled",
				editor_context: true,
				callback: async (editor: Editor, view: MarkdownView) => {
					const loaded_settings = get(settings);

					let language = this.current_language;
					if (loaded_settings.target_language_preference === "last") {
						language = loaded_settings.last_used_target_languages?.first();
						if (!language) {
							this.message_queue("No last language found, select language manually");
							new TranslateModal(this.app, this, "selection").open()
							return;
						}
					} else if (loaded_settings.target_language_preference === "specific")
						language = loaded_settings.default_target_language;

					await translate_selection(this, editor, language, loaded_settings.apply_glossary);
				}
			},
			{
				id: "translator-detection",
				name: "Detect language of selection",
				icon: "detect-selection",
				editor_context: true,
				callback: async (editor: Editor, view: MarkdownView) => {
					await detect_selection(this, editor);
				},
			}
		]


		for (let command of commands) {
			if (Platform.isMobile || command.editor_context) {
				command.editorCallback = command.callback;
				delete command.callback;
			}

			this.addCommand(command);
		}


		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
				if (!(file instanceof TFolder)) {
					menu.addItem((item) => {
						item.setTitle("Translate note to new file")
							.setIcon("translate")
							.onClick(async (a) => {
								await new TranslateModal(this.app, this, "file-new", <TFile>file).open();
							});
					})
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				if (this.translator.has_autodetect_capability()) {
					const languages = get(available_languages);
					const languages_dict = get(all_languages);
					if (languages.length) {
						menu.addItem((item) => {
							const translation_callback = async (language: string) => {
								const output = await translate_selection(this, editor, language, loaded_settings.apply_glossary);
								if (output.status_code === 200) {
									settings.update((x: TranslatorPluginSettings) => {
										if (!x.last_used_target_languages.contains(language)) {
											x.last_used_target_languages = [language, ...x.last_used_target_languages].slice(0, 3);
										} else {
											x.last_used_target_languages = x.last_used_target_languages.filter(x => x !== language);
											x.last_used_target_languages = [language, ...x.last_used_target_languages];
										}
										return x;
									});
								} else if (output.message) {
									this.message_queue(output.message)
								}
							}

							const loaded_settings = get(settings);
							let pinned_languages: string[] = [];
							if (loaded_settings.target_language_preference === "last")
								pinned_languages = loaded_settings.last_used_target_languages;
							else if (loaded_settings.target_language_preference === "specific")
								pinned_languages = [loaded_settings.default_target_language];
							else if (loaded_settings.target_language_preference === "display")
								pinned_languages = [this.current_language];
							pinned_languages = pinned_languages.filter(x => languages.includes(x));


							item.setTitle("Translate")
								.setIcon("translate")
								.setDisabled(!this.translator.valid || !editor.getSelection())
								.setSection("translate")
								.onClick(async (e) => {
									// @ts-ignore (e.target exists)
									if (e.target.className !== "menu-item") {
										const language: string = pinned_languages.first() ||
											(languages.includes(loaded_settings.default_target_language) && loaded_settings.default_target_language) ||
											(languages.includes(this.current_language) && this.current_language) ||
											languages.first();
										await translation_callback(language)
									}
								});

							const element = (item as any).dom as HTMLElement;
							element.classList.add("translator-dropdown")
							let dropdown_icon = element.createEl("span", {cls: "translator-dropdown-logo"})
							setIcon(dropdown_icon, "chevron-right");


							let d_menu = element.createDiv( {cls: "menu translator-dropdown-menu"});

							let d_menu_items = Array.from(languages)
								.map((locale) => { return [locale, languages_dict.get(locale)]; })
								.sort((a, b) => a[1].localeCompare(b[1]));

							if (pinned_languages) {
								for (let locale of pinned_languages) {
									let d_item = d_menu.createDiv({cls: "menu-item translator-dropdown-menu-item", text: languages_dict.get(locale)});
									this.registerDomEvent(d_item, "click", async () => translation_callback(locale));
								}
								d_menu.createDiv({cls: "menu-separator"});
							}

							for (let [locale, name] of d_menu_items) {
								let d_item = d_menu.createDiv({cls: "menu-item", text: name});
								this.registerDomEvent(d_item, "click", async () => translation_callback(locale));
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
	}

	async onunload() {
		this.reactivity.$destroy();
		this.uninstall();
	}

	async activateTranslatorView() {
		const loaded_settings = get(settings);
		const translation_service: string = loaded_settings.translation_service;

		let target_language = this.current_language;
		if (loaded_settings.target_language_preference === "last")
			target_language = loaded_settings.last_used_target_languages.last() || loaded_settings.default_target_language;
		else if (loaded_settings.target_language_preference === "specific")
			target_language = loaded_settings.default_target_language;

		const view_state = {
			type: TRANSLATOR_VIEW_ID,
			active: true,
			state: {
				language_from: loaded_settings.default_source_language || 'auto',
				language_to: target_language,
				translation_service: translation_service,
			}
		};
		// @ts-ignore (Prevent build crash)
		if (!(this.app.workspace.activeLeaf == null) && this.app.workspace.activeLeaf.getRoot() == this.app.workspace.rootSplit) {
			await this.app.workspace.getLeaf('split', 'vertical').setViewState(view_state)
		} else {
			const right_leaf = this.app.workspace.getRightLeaf(false);

			// Add the translator leaf to the right sidebar
			await right_leaf.setViewState(view_state);

			// Get the translator leaf and reveal it
			this.app.workspace.revealLeaf(right_leaf);
		}
	}

	// --------------------------------------------------------------


	async saveSettings(updatedSettings: any) {
		await this.saveData(updatedSettings);
	}


	// ------------------------- External Interface -------------------------

	async setTranslationService(service: string) {
		if (service in SERVICES_INFO) {
			settings.update((x: TranslatorPluginSettings) => {
				x.translation_service = service;
				return x;
			});
		} else {
			console.error(`Service ${service} not found`);
		}
	}
}
