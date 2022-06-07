import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";
import {APIServiceProviders, APIServiceSettings, TranslatorPluginSettings} from "./types";
import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID} from "./constants";
import {DummyTranslate, BingTranslator, GoogleTranslate, Deepl, LibreTranslate, YandexTranslate} from "./handlers";

import ISO6391, {LanguageCode} from "iso-639-1";
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
	settings: TranslatorPluginSettings;
	settings_listener: any


	settings_page: TranslatorSettingsTab;
	view_page: TranslatorView;


	current_language: string;
	detected_language: string;
	service_data: APIServiceSettings;


	all_languages: Map<LanguageCode, string> = new Map();
	available_languages: any[] = [];


	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;

	//@ts-ignore (Included with polyfill)
	localised_names: Intl.DisplayNames;

	async onload() {
		await this.loadSettings();

		var self: TranslatorPlugin = this;
		this.service_data = this.settings.service_settings[this.settings.translation_service as keyof APIServiceProviders];


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
		this.settings_listener = ObservableSlim.create(this.settings, false, async function(changes) {
			if (changes[0].type === "update") {
				let key = changes[0].currentPath.split(".")[0];
				let value = changes[0].newValue;
				switch (key) {
					case "language_from":
						console.log("Language from changed");
						self.view_page.left_select.childNodes[0].textContent = 'Detect Language';
						if (self.service_data.auto_translate) {
							await self.view_page.translate();
						}
						break;

					case "language_to":
						console.log("Language to changed");
						self.view_page.output_field.value = '';

						if (self.service_data.auto_translate) {
							await self.view_page.translate();
						}

						break;

					case "translation_service":
						console.log("Translation service changed");

						await self.setupTranslationService();
						self.service_data = self.settings.service_settings[value as keyof APIServiceProviders]

						if (self.settings.filter_service_languages) {
							self.settings_page.updateLanguageSelection();
							self.settings_page.updateLanguageView();
						}

						await self.view_page.updateTooltip();
						if (self.service_data.auto_translate) {
							await self.view_page.translate();
						}

						// Reveal correspondings settings tab for the selected service
						self.settings_page.showServiceSettings(value);

						break;

					case "service_settings":
						// Get last key of the path
						switch (changes[0].currentPath.split(".").at(-1)) {
							case "api_key":
								console.log("API key changed");
								await self.setupTranslationService();
								break;
							case "host":
								console.log("Host changed");
								await self.setupTranslationService();
								break;
							case "auto_translate":
								console.log("Auto translate changed");

								// Hide the translate button if auto translate is enabled
								self.view_page.translate_button.classList.toggle("hide-element", self.service_data.auto_translate);
								if (self.service_data.auto_translate) {
									await self.view_page.translate();
								}
								break;
						}
						if (self.service_data.auto_translate) {
							await self.view_page.translate();
						}
						break;

					case "display_language":
						console.log("Display language changed");

						// Obsidian's current display language is updated internally when this setting is changed
						// (will not be updated when the display language is changed)
						const updated_lang = window.localStorage.getItem('language') || 'en';
						if (updated_lang !== self.current_language) {
							await self.updateLocalisation();
						}

						self.updateLanguageNames();
						self.settings_page.updateLanguageView();
						self.settings_page.updateLanguageSelection();
						self.view_page.updateLanguageSelection();
						break;

					case "selected_languages":
						console.log("Selected languages changed");
						self.settings_page.updateLanguageSelection();
						self.settings_page.updateLanguageView();
						self.view_page.updateLanguageSelection();
						break;

					case "use_spellchecker_languages":
						console.log("Use spellchecker languages changed");
						self.settings_page.updateAvailableLanguages();
						self.settings_page.updateLanguageView();
						self.view_page.updateLanguageSelection();
						break;

					case "filter_service_languages":
						console.log("Filter service languages changed");
						self.settings_page.updateLanguageSelection();
						self.settings_page.updateLanguageView();
						break;
				}
				await self.saveSettings();
			}
		});
		// --------------------------------------------------------------------


		// ObservableSlim.create(this.settings.selected_languages, false, function(changes) {});
		// ObservableSlim.create(this.settings.service_settings, false, function(changes) {});
		// for (let service of Object.keys(this.settings.service_settings))
		// 	ObservableSlim.create(this.settings.service_settings[service as keyof APIServiceProviders], false, function(changes) {});

		this.current_language = await this.fixLanguageCode(window.localStorage.getItem('language') || 'en-US');
		await this.updateLocalisation();
		await this.setupTranslationService();

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
	async setupTranslationService() {
		switch (this.settings.translation_service) {
			case 'google_translate':
				this.translator = new GoogleTranslate(this.settings.service_settings.google_translate.api_key);
				break;
			case 'libre_translate':
				this.translator = new LibreTranslate(this.settings.service_settings.libre_translate.host);
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

	async updateLocalisation() {
		// @ts-ignore (Intl.DisplayNames is polyfilled)
		this.localised_names = new Intl.DisplayNames([this.current_language], {type: 'language'});

		// Get correct names for all available locales
		this.updateLanguageNames();

	}

	updateLanguageNames(): void {
		// For every locale in all languages, update the name based on the currently selected language display setting
		for (let locale of this.locales) {
			if (this.settings.display_language === "local") {
				this.all_languages.set(locale, ISO6391.getNativeName(locale));
			} else if (this.settings.display_language === "display") {
				this.all_languages.set(locale, this.localised_names.of(locale));
			}
		}
	}

	// -------------------------------------------------------------


	// --------------------  Settings management  --------------------
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.saveSettings();

		// FIXME: This is to make the program work with hotreload (should not be a problem when running the program normally)
		//  The plugin gets disabled and then re-enabled if main.js is changed, however, the view does not seem to
		//  match with the one that is currently displayed.
		// let views = this.app.workspace.getLeavesOfType(TRANSLATOR_VIEW_ID);
		// if (views.length) {
		// 	this.view_page = <TranslatorView> views[0].view;
		// }
	}


	async saveSettings() {
		await this.saveData(this.settings);
	}

	async savePartialSettings(changedOptions: (settings: TranslatorPluginSettings) => Partial<TranslatorPluginSettings>) {
		this.settings = Object.assign({}, this.settings, changedOptions(this.settings));
		await this.saveData(this.settings);
	}
	// ---------------------------------------------------------------
}
