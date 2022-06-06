import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView, TRANSLATOR_VIEW_ID} from "./view";
import {TranslatorPluginSettings} from "./types";
import {ICONS, DEFAULT_SETTINGS} from "./constants";
import {DummyTranslate, BingTranslator, GoogleTranslate, Deepl, LibreTranslate, YandexTranslate} from "./handlers";


import ISO6391, {LanguageCode} from "iso-639-1";


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
	current_language: string;
	all_languages: Map<LanguageCode, string> = new Map();
	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;

	//@ts-ignore (Included with polyfill)
	localised_names: Intl.DisplayNames;

	async onload() {
		await this.loadSettings();

		this.current_language = await this.fixLanguageCode(window.localStorage.getItem('language') || 'en-US');
		await this.updateLocalisation();
		await this.setupTranslationService();

		// ------------------  Load in custom icons  ------------------

		// Load icons into Obsidian
		for (const [id, icon] of Object.entries(ICONS)) {
			addIcon(id, icon);
		}

		// ------------------------------------------------------------

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// Register the view to the app.
		this.registerView(
			TRANSLATOR_VIEW_ID,
			(leaf) => new TranslatorView(leaf, this.app, this)
		);
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


	// ---------------- Translator wrapper functions ----------------
	async translate(text: string) {
		if (this.settings.language_to === this.settings.language_from) {
			return text;
		}
		return await this.translator.translate(text, this.settings.language_from, this.settings.language_to);
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
