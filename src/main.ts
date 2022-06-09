import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {writable, type Writable} from "svelte/store";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";

import type {APIServiceProviders, APIServiceSettings, PluginData, TranslatorPluginSettings} from "./types";
import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, DEFAULT_DATA} from "./constants";
import {DummyTranslate, BingTranslator, GoogleTranslate, Deepl, LibreTranslate, YandexTranslate} from "./handlers";
import {rateLimit} from "./util";

import ISO6391 from "iso-639-1";
import type {LanguageCode} from "iso-639-1";

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

	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;

	// Limit queue to only run one message of translator plugin at a time (limitCount 0 means that none of the proceeding messages will be queued)
	message_queue: ((...args: any) => void)

	// TODO: Set time interval for translation process to run (to ensure that translations can't overlap)
	// translation_queue = rateLimit(0, 200, async () => {
	// 	await this.view_page.translate();
	// });

	async onload() {
		this.message_queue = rateLimit(1, 5000, (text: string, timeout: number = 4000) => {
			new Notice(text, timeout);
		});

		this.settings = writable<TranslatorPluginSettings>();
		await this.loadSettings();

		this.plugin_data = writable<PluginData>();
		this.plugin_data_proxy = DEFAULT_DATA
		this.plugin_data.set(this.plugin_data_proxy);

		var self: TranslatorPlugin = this;


		// Save all settings on update of this.settings
		this.register(this.settings.subscribe((data) => {
			this.saveSettings(data);
		}));

		// There is currently no way to catch when the display language of Obsidian is being changed, as it is not reactive
		// (add current display language to app.json?)
		// So 'display languages' setting will only be applied correctly when the program is fully restarted or when
		// the language display name setting is changed.
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


		// ------------------------  Setup plugin pages  ----------------------
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// Register the view to the app.

		this.registerView(
			TRANSLATOR_VIEW_ID,
			(leaf) => new TranslatorView(leaf, this.app, this)
		);

		// --------------------------------------------------------------------


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
	// -------------------------------------------------------------


	// --------------------  Settings management  --------------------
	async loadSettings() {
		const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.settings_proxy = settings;

		this.settings.set(this.settings_proxy);
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
