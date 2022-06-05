import {addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {TranslatorSettingsTab} from "./settings";
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


interface TranslatorPluginSettings {
	selected_languages: Array<any>;
	available_languages: Array<any>;
	use_spellchecker_languages: boolean;
	display_language: string;
}

const DEFAULT_SETTINGS: TranslatorPluginSettings = {
	selected_languages: ['en', 'fr', 'nl'],
	available_languages: ['en', 'fr', 'nl'],
	use_spellchecker_languages: false,
	display_language: 'display',
}
export default class TranslatorPlugin extends Plugin {
	settings: TranslatorPluginSettings;
	current_language: string;
	all_languages: Map<LanguageCode, string> = new Map();
	locales = ISO6391.getAllCodes();

	//@ts-ignore (Included with polyfill)
	localised_names: Intl.DisplayNames;

	async onload() {
		await this.loadSettings();

		this.current_language = await this.fixLanguageCode(window.localStorage.getItem('language') || 'en-US');
		await this.updateLocalisation();

		// Fetch icon list from github
		const iconList: Record<string, string>[] = await (await fetch('https://raw.githubusercontent.com/Fevol/obsidian-translate/master/src/assets/icons.json')).json();

		// Load icons into Obsidian
		for (const [id, icon] of Object.entries(iconList)) {
			addIcon(id, icon);
		}

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TranslatorSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.saveSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		console.log('Saving settings', this.settings);
	}

	async savePartialSettings(changedOptions: (settings: TranslatorPluginSettings) => Partial<TranslatorPluginSettings>) {
		this.settings = Object.assign({}, this.settings, changedOptions(this.settings));
		await this.saveData(this.settings);
	}

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
		// @ts-ignore
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

}


class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

