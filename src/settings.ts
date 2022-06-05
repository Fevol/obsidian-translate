import {App, ButtonComponent, DropdownComponent, PluginSettingTab, Setting} from "obsidian";
import type TranslatorPlugin from "./main";
import ISO6391, {LanguageCode} from "iso-639-1";

let spellcheck_languages = new Set<LanguageCode>();
let all_languages: Map<LanguageCode, string> = new Map();
// const displayNames = new Intl.DisplayNames(['en'], {type: 'region'});

const locales = ISO6391.getAllCodes();

for (const locale of locales) {
	all_languages.set(locale, ISO6391.getName(locale));
}


// Settings page for the plugin
export class TranslatorSettingsTab extends PluginSettingTab {
	plugin: TranslatorPlugin;
	language_view: HTMLElement;
	language_selection: DropdownComponent;

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		this.updateLanguageNames();

		let select_languages = new Setting(this.containerEl)
			.setName("Translator languages")
			.setDesc("Choose the languages to be included in the translation selection")


		this.language_view = select_languages.controlEl.createDiv({cls: 'setting-command-hotkeys'});
		this.updateLanguageView();


		select_languages.addDropdown((dropdown) => {
			this.language_selection = dropdown;

			this.updateLanguageSelection();

			dropdown.onChange(async (code) => {
				// If not default, or language was already selected, add it to the list
				if (code !== "default" && !this.plugin.settings.available_languages.has(code)) {
					// Add language to list of selected languages (persistent)
					this.plugin.settings.available_languages.add(code);

					this.updateLanguageSelection();
					this.updateLanguageView();
				}
			});
		});

		new Setting(this.containerEl)
			.setName("Sync with spellchecker languages")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.use_spellchecker_languages);
				toggle.onChange((value) => {
					select_languages.setDisabled(value);
					this.plugin.settings.use_spellchecker_languages = value;
					//	TODO: Copy languages of spellchecker

					if (value) {
						this.plugin.settings.selected_languages = this.plugin.settings.available_languages;

						// app.vault.config does exist
						// @ts-ignore
						const spellchecker_languages = this.app.vault.config.spellcheckLanguages.map((x) => {
							// Remove the region language code (e.g. en-US)
							return x.split('-')[0];
						});

						this.plugin.settings.available_languages = new Set(spellchecker_languages.filter((code: LanguageCode) => {
							return all_languages.has(code);
						}));

					} else {
						this.plugin.settings.available_languages = this.plugin.settings.selected_languages;
					}


					this.updateLanguageView();


				});
			});

		new Setting(this.containerEl)
			.setName("Language display name")
			.setDesc("Select in which language the language name should be displayed")
			.addDropdown((dropdown) => {
				dropdown.addOption("display", 'Display Language');
				dropdown.addOption("local", 'Localised Language');
				dropdown.onChange((value) => {
					this.plugin.settings.display_language = value;
					this.updateLanguageNames();
					this.updateLanguageView();
					this.updateLanguageSelection();
				});
				dropdown.setValue(this.plugin.settings.display_language);
			});

		new Setting(this.containerEl)
			.setName("Translation Service")
			.addDropdown((dropdown) => {
				dropdown.addOption("googleTranslate", 'Google Translate');
			});

	}

	updateLanguageNames(): void {
		// For every locale in all languages, update the name based on the currently selected language display setting
		for (let locale of all_languages.keys()) {
			if (this.plugin.settings.display_language === "local") {
				all_languages.set(locale, ISO6391.getNativeName(locale));
			} else if (this.plugin.settings.display_language === "display") {
				all_languages.set(locale, ISO6391.getName(locale));
			}
		}
	}

	updateLanguageView(): void {
		this.language_view.empty();

		const languages = Array.from(this.plugin.settings.available_languages).map((code) => {
			return [code, all_languages.get(code)];
		}).sort((a, b) => {
			return a[1].localeCompare(b[1]);
		});


		for (let [code, lang] of languages) {
			let lang_el = this.language_view.createEl('span', {text: all_languages.get(code), cls: 'setting-hotkey'});
			if (!this.plugin.settings.use_spellchecker_languages) {
				let remove_button = lang_el.createEl('span', {
					// Poor man's x-mark
					text: 'x'
				});
				remove_button.addClass('setting-hotkey-icon')

				remove_button.addEventListener('click', () => {
					this.plugin.settings.available_languages.delete(code);
					this.updateLanguageView();
					this.updateLanguageSelection();
				});
			}
		}
	}

	updateLanguageSelection(): void {
		// Available languages are all the languages that are not selected

		// Filter from all languages the ones that are not selected

		const languages: [string, string][] = [...all_languages.entries()].filter((code) => {
				return !this.plugin.settings.available_languages.has(code);
			}
		).sort((a, b) => {
			return a[1].localeCompare(b[1])
		});

		this.language_selection.selectEl.empty();
		this.language_selection.addOption("default", '+');
		languages.forEach((code) => {
			this.language_selection.addOption(code[0], code[1]);
		});
	}

}

