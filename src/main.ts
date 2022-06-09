import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {get, writable, type Writable} from "svelte/store";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";

import type {APIServiceProviders, APIServiceSettings, PluginData, TranslatorPluginSettings} from "./types";
import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, DEFAULT_DATA} from "./constants";
import {DummyTranslate, BingTranslator, GoogleTranslate, Deepl, LibreTranslate, YandexTranslate} from "./handlers";
import {toTitleCase, rateLimit} from "./util";

import ISO6391 from "iso-639-1";
import type {LanguageCode} from "iso-639-1";

import * as ObservableSlim from "observable-slim";

// Import all the locale data for the supported languages of Obsidian
// FIXME: Large filesize, can this be loaded on demand?
import '@formatjs/intl-displaynames/polyfill'
import "./language_locales";


// import {shouldPolyfill} from '@formatjs/intl-displaynames/should-polyfill'
// Import the locale data for the currently set display language for Obsidian
// export async function polyfillLocale(locale: string) {
// 	const unsupportedLocale = shouldPolyfill(locale)
// 	// This locale is already loaded in, should not polyfill
// 	if (!unsupportedLocale) {
// 		return
// 	}
// 	// Load the polyfill first BEFORE loading data
// 	await import('@formatjs/intl-displaynames/polyfill-force')
// 	await import(`@formatjs/intl-displaynames/locale-data/${unsupportedLocale}.js`)
// }


export default class TranslatorPlugin extends Plugin {
	settings: Writable<TranslatorPluginSettings>;
	settings_proxy: TranslatorPluginSettings;
	plugin_data: Writable<PluginData>;
	plugin_data_proxy: PluginData

	settings_page: TranslatorSettingsTab;
	view_page: TranslatorView;


	current_language: string;
	detected_language: string;
	service_data: APIServiceSettings;
	//@ts-ignore (Included with polyfill)
	localised_names: Intl.DisplayNames;

	all_languages: Map<LanguageCode, string> = new Map();
	available_languages: any[] = [];
	settings_listener: any;

	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;
	// Limit queue to only run one message of translator plugin at a time (limitCount 0 means that none of the proceeding messages will be queued)
	message_queue: ((...args: any) => void)


	// TODO: Set time interval for this to run
	// translation_queue = rateLimit(0, 200, async () => {
	// 	await this.view_page.translate();
	// });

	async onload() {
		this.message_queue = rateLimit(1, 5000, (text: string, timeout: number = 4000) => {
			new Notice(text, timeout);
		});

		this.settings = writable<TranslatorPluginSettings>();
		this.settings_listener = {
			set(target: any, key: string, value: any) {

				target[key] = value;

				switch (key) {
					case "filter_service_languages":
						break;
					case "use_spellchecker_languages":
						break;
				}


				return true;
			}
		};

		await this.loadSettings();

		this.plugin_data = writable<PluginData>();
		this.plugin_data_proxy = DEFAULT_DATA
		this.plugin_data.set(this.plugin_data_proxy);

		var self: TranslatorPlugin = this;


		// Save all settings on update of this.settings
		this.register(this.settings.subscribe((data) => {
			this.saveSettings(data);
		}));

		this.plugin_data_proxy.current_language = await this.fixLanguageCode(window.localStorage.getItem('language') || 'en-US');
		this.localised_names = new Intl.DisplayNames([this.plugin_data_proxy.current_language], {type: 'language'});

		this.plugin_data_proxy.all_languages = new Map(this.locales.map((locale) => {
			if (this.settings_proxy.display_language === 'local')
				return [locale, ISO6391.getName(locale)]
			else if (this.settings_proxy.display_language === 'display')
				return [locale, this.localised_names.of(locale)]
		}));

		// @ts-ignore (Config exists in vault)
		this.plugin_data_proxy.spellchecker_languages = [...new Set(this.app.vault.config.spellcheckLanguages.map((x) => {
			return x.split('-')[0];
		}))]

		this.plugin_data_proxy.available_languages = this.settings_proxy.use_spellchecker_languages ? this.plugin_data_proxy.spellchecker_languages : this.settings_proxy.selected_languages;


		// this.service_data = this.settings.service_settings[this.settings.translation_service as keyof APIServiceProviders];


		// ------------------------  Setup plugin pages  ----------------------
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// Register the view to the app.

		this.registerView(
			TRANSLATOR_VIEW_ID,
			(leaf) => new TranslatorView(leaf, this.app, this)
		);

		// --------------------------------------------------------------------


		// ------------------  Listener for Settings values  ------------------

		// Implements (admittedly primitive) reactivity for the settings, settings page or view gets updated when internal settings change
		// this.settings_listener = ObservableSlim.create(this.settings, false, async function (changes) {
		// 	if (changes[0].type === "update") {
		// 		// await self.saveSettings();
		// 		let key = changes[0].currentPath.split(".")[0];
		// 		let value = changes[0].newValue;
		// 		console.log(`'${toTitleCase(changes[0].currentPath.split('.').at(-1).replace('_', ' '))}' changed`);
		//
		// 		switch (key) {
		// 			case "language_from":
		// 				self.view_page.left_select.childNodes[0].textContent = 'Detect Language';
		// 				if (self.service_data.auto_translate) {
		// 					await self.view_page.translate();
		// 				}
		// 				break;
		//
		// 			case "language_to":
		// 				self.view_page.output_field.value = '';
		//
		// 				if (self.service_data.auto_translate) {
		// 					await self.view_page.translate();
		// 				}
		//
		// 				break;
		//
		// 			case "translation_service":
		// 				await self.setupTranslationService();
		// 				// self.service_data = self.settings.service_settings[value as keyof APIServiceProviders]
		//
		// 				// if (self.settings.filter_service_languages) {
		// 				// 	self.settings_page.updateAvailableLanguages();
		// 				// 	self.settings_page.updateLanguageSelection();
		// 				// 	self.settings_page.updateLanguageView();
		// 				// }
		//
		// 				await self.view_page.updateTooltip();
		// 				if (self.service_data.auto_translate) {
		// 					await self.view_page.translate();
		// 				}
		//
		// 				// Reveal correspondings settings tab for the selected service
		// 				// self.settings_page.showServiceSettings(value);
		//
		// 				break;
		//
		// 			case "service_settings":
		// 				// Get last key of the path
		// 				switch (changes[0].currentPath.split(".").at(-1)) {
		// 					case "api_key":
		// 					case "region" :
		// 					case "host":
		// 						// self.settings.service_settings[self.settings.translation_service as keyof APIServiceProviders].validated = null;
		// 						// self.settings_page.setButtonStatus(self.settings_page.validate_button, self.settings_page.validate_button_icon, null);
		// 						await self.setupTranslationService();
		// 						break;
		// 					case "auto_translate":
		// 						// Hide the translate button if auto translate is enabled
		// 						self.view_page.translate_button.classList.toggle("hide-element", self.service_data.auto_translate);
		// 						if (self.service_data.auto_translate) {
		// 							await self.view_page.translate();
		// 						}
		// 						break;
		// 				}
		// 				if (self.service_data.auto_translate) {
		// 					await self.view_page.translate();
		// 				}
		// 				break;
		//
		// 			case "display_language":
		// 				// Obsidian's current display language is updated internally when this setting is changed
		// 				// (will not be updated when the display language is changed)
		// 				const updated_lang = window.localStorage.getItem('language') || 'en';
		// 				if (updated_lang !== self.current_language) {
		// 					await self.updateLocalisation();
		// 				}
		//
		// 				self.updateLanguageNames();
		// 				self.settings_page.updateLanguageView();
		// 				self.settings_page.updateLanguageSelection();
		// 				self.view_page.updateLanguageSelection();
		// 				break;
		//
		// 			case "selected_languages":
		// 			case "filter_service_languages":
		// 				// FIXME: Wasteful? Heck yes. Try to find a better way to do this.
		// 				self.settings_page.updateAvailableLanguages();
		// 				self.settings_page.updateLanguageSelection();
		// 				self.settings_page.updateLanguageView();
		// 				self.view_page.updateLanguageSelection();
		// 				break;
		//
		// 			case "use_spellchecker_languages":
		// 				self.settings_page.updateAvailableLanguages();
		// 				self.settings_page.updateLanguageView();
		// 				self.view_page.updateLanguageSelection();
		// 				break;
		//
		// 		}
		// 	}
		// });
		// --------------------------------------------------------------------


		// ObservableSlim.create(this.settings.selected_languages, false, function(changes) {});
		// ObservableSlim.create(this.settings.service_settings, false, function(changes) {});
		// for (let service of Object.keys(this.settings.service_settings))
		// 	ObservableSlim.create(this.settings.service_settings[service as keyof APIServiceProviders], false, function(changes) {});

		let service_settings = this.settings_proxy.service_settings[this.settings_proxy.translation_service as keyof APIServiceProviders];
		this.setupTranslationService(
			this.settings_proxy.translation_service,
			service_settings.api_key,
			service_settings.region,
			service_settings.host,
		);

		// ------------------  Load in custom icons  ------------------

		// Load icons into Obsidian
		for (const [id, icon] of Object.entries(ICONS))
			addIcon(id, icon);

		// ------------------------------------------------------------

		this.addRibbonIcon("translate", "Open translation view", () => {
			this.activateTranslatorView();
		});

	}

	async activateTranslatorView() {
		this.app.workspace.detachLeavesOfType(TRANSLATOR_VIEW_ID);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: TRANSLATOR_VIEW_ID,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(TRANSLATOR_VIEW_ID)[0]
		);
	}

	// ----------------  Set up translation service  ----------------
	setupTranslationService(service: string, api_key: string = '', region: string = '', host: string = '') {
		switch (service) {
			case 'google_translate':
				this.translator = new GoogleTranslate(api_key);
				break;
			case 'libre_translate':
				this.translator = new LibreTranslate(host);
				break;
			case 'bing_translator':
				this.translator = new BingTranslator(api_key, region);
				break;
			default:
				this.translator = new DummyTranslate();
		}
	}

	// --------------------------------------------------------------


	// ------------------  Process language codes  ------------------
	async fixLanguageCode(code: string) {
		switch (code) {
			case "tam":
				return "ta";
			case "cz":
				return "cs";
			default:
				// FIXME: intl-displaynames doesn't support the "zh-TW" or "pt-BR" locales
				return code.split("-")[0];
		}
	}

	// async updateLocalisation() {
	// 	// @ts-ignore (Intl.DisplayNames is polyfilled)
	// 	this.localised_names = new Intl.DisplayNames([this.current_language], {type: 'language'});
	//
	// 	// Get correct names for all available locales
	// 	// this.updateLanguageNames();
	//
	// }

	// updateLanguageNames(): void {
	// 	// For every locale in all languages, update the name based on the currently selected language display setting
	// 	for (let locale of this.locales) {
	// 		if (this.settings.display_language === "local") {
	// 			this.all_languages.set(locale, ISO6391.getNativeName(locale));
	// 		} else if (this.settings.display_language === "display") {
	// 			this.all_languages.set(locale, this.localised_names.of(locale));
	// 		}
	// 	}
	// }

	// -------------------------------------------------------------


	// --------------------  Settings management  --------------------
	async loadSettings() {
		const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.settings_proxy = settings;

		this.settings.set(this.settings_proxy);


		// FIXME: This is to make the program work with hotreload (should not be a problem when running the program normally)
		//  The plugin gets disabled and then re-enabled if main.js is changed, however, the view does not seem to
		//  match with the one that is currently displayed.
		// let views = this.app.workspace.getLeavesOfType(TRANSLATOR_VIEW_ID);
		// if (views.length) {
		// 	this.view_page = <TranslatorView> views[0].view;
		// }
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
