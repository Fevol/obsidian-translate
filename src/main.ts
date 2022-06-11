import {addIcon, App, Editor, moment, MarkdownView, Modal, Notice, Plugin} from 'obsidian';

import {writable, type Writable} from "svelte/store";
import {Reactivity, ViewPage} from "./ui/translator-components";

import {TranslatorSettingsTab} from "./settings";
import {TranslatorView} from "./view";
import {SwitchService} from "./modals";

import type {APIServiceProviders, APIServiceSettings, PluginData, TranslatorPluginSettings} from "./types";
import {ICONS, DEFAULT_SETTINGS, TRANSLATOR_VIEW_ID, DEFAULT_DATA} from "./constants";
import {DummyTranslate, BingTranslator, GoogleTranslate, Deepl, LibreTranslate, YandexTranslate} from "./handlers";
import {rateLimit} from "./util";

import ISO6391 from "iso-639-1";


export default class TranslatorPlugin extends Plugin {
	settings: Writable<TranslatorPluginSettings>;
	plugin_data: Writable<PluginData>;

	settings_page: TranslatorSettingsTab;
	view_page: TranslatorView;


	current_language: string;
	detected_language: string;
	service_data: APIServiceSettings;

	available_languages: any[] = [];

	locales = ISO6391.getAllCodes();
	translator: DummyTranslate;

	reactivity: Reactivity;

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
			(leaf) => new TranslatorView(leaf, this.app, this)
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
			callback: () => {
				this.activateTranslatorView();
			},
		});

		this.addCommand({
			id: "translator-change-service",
			name: "Change Translator Service",
			callback: () => {
				new SwitchService(this.app, this).open();
			},
		});
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

		// Get the translator leaf
		const leaf = this.app.workspace.getLeavesOfType(TRANSLATOR_VIEW_ID)[0];

		this.app.workspace.revealLeaf(leaf);
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
		const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings.set(settings);
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
