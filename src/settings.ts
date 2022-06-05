import {App, ButtonComponent, DropdownComponent, PluginSettingTab, Setting, setIcon} from "obsidian";
import type TranslatorPlugin from "./main";
import {LanguageCode} from "iso-639-1";

// There is currently no way to catch when the display language of Obsidian is being changed, as it is not reactive
// (add current display language to app.json?)
// So 'display languages' setting will only be applied correctly when the program is fully restarted or when
// the language display name setting is changed.

// Settings page for the plugin
export class TranslatorSettingsTab extends PluginSettingTab {
	plugin: TranslatorPlugin;
	language_view: HTMLElement;
	language_selection: DropdownComponent;

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const {containerEl} = this;
		containerEl.empty();

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
				if (code !== "default" && !this.plugin.settings.available_languages.includes(code)) {
					// Add language to list of selected languages (persistent)
					this.plugin.settings.selected_languages.push(code);
					this.plugin.settings.available_languages.push(code);
					await this.plugin.saveSettings();

					this.updateLanguageSelection();
					this.updateLanguageView();
				}
			});
		});

		new Setting(this.containerEl)
			.setName("Sync with spellchecker languages")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.use_spellchecker_languages);
				toggle.onChange(async (value) => {
					select_languages.setDisabled(value);
					this.plugin.settings.use_spellchecker_languages = value;
					await this.plugin.saveSettings();

					if (value) {
						this.plugin.settings.selected_languages = this.plugin.settings.available_languages;
						// FIXME: Spellcheck languages are only synced when the toggle is switched on (do this in startup?)
						// Remove all dialects from the locales and keep the unique languages
						// @ts-ignore (app.vault.config exists)
						const spellchecker_languages = [...new Set(this.app.vault.config.spellcheckLanguages.map((x) => {
							// Remove the region language code (e.g. en-US)
							return x.split('-')[0];
						}))];

						this.plugin.settings.available_languages = spellchecker_languages.filter((code: LanguageCode) => {
							return this.plugin.all_languages.has(code);
						});
					} else {
						this.plugin.settings.available_languages = this.plugin.settings.selected_languages;
					}
					await this.plugin.saveSettings();
					this.updateLanguageView();
				});
			});

		new Setting(this.containerEl)
			.setName("Language display name")
			.setDesc("Select in which language the language name should be displayed")
			.addDropdown(async (dropdown) => {
				dropdown.addOption("display", 'Display Language');
				dropdown.addOption("local", 'Localised Language');
				dropdown.onChange((value) => {
					// Obsidian's current display language is updated internally when this setting is changed
					// (will not be updated when the display language is changed)
					const updated_lang = window.localStorage.getItem('language') || 'en';
					if (updated_lang !== this.plugin.current_language) {
						this.plugin.updateLocalisation();
					}

					this.plugin.settings.display_language = value;
					this.plugin.saveSettings();

					this.plugin.updateLanguageNames();
					this.updateLanguageView();
					this.updateLanguageSelection();
				});
				dropdown.setValue(this.plugin.settings.display_language);
			});

		let translation_services = new Setting(this.containerEl)
			.setName("Translation Service");


		const translation_services_list = [
			{label: "Google Translate", value: "google-translate"},
			{label: "Deepl", value: "deepl"},
			{label: "Bing Translator", value: "bing-translator"},
			{label: "Yandex Translate", value: "yandex-translate"},
			{label: "Libre Translate", value: "libre-translate"},
		];

		let translation_services_dropdown = translation_services.controlEl.createEl("select", {cls: "dropdown"});

		for (const service of translation_services_list) {
			let option = translation_services_dropdown.createEl("option", {
				value: service.value,
				text: service.label,
			});
		}


	}

	updateLanguageView(): void {
		this.language_view.empty();

		const languages = Array.from(this.plugin.settings.available_languages).map((code) => {
			return [code, this.plugin.all_languages.get(code)];
		}).sort((a, b) => {
			return a[1].localeCompare(b[1]);
		});


		for (let [code, lang] of languages) {
			let lang_el = this.language_view.createEl('span', {
				text: this.plugin.all_languages.get(code),
				cls: 'setting-hotkey'
			});
			if (!this.plugin.settings.use_spellchecker_languages) {
				let remove_button = lang_el.createEl('span', {
					// Poor man's x-mark
					text: 'x'
				});
				remove_button.addClass('setting-hotkey-icon')

				remove_button.addEventListener('click', async () => {
					this.plugin.settings.selected_languages.remove(code);
					this.plugin.settings.available_languages.remove(code);
					await this.plugin.saveSettings();
					this.updateLanguageView();
					this.updateLanguageSelection();
				});
			}
		}
	}

	updateLanguageSelection(): void {
		// Available languages are all the languages that are not selected

		// Filter from all languages the ones that are not selected

		const languages: [string, string][] = [...this.plugin.all_languages.entries()]
			.filter((a) => {
				return !this.plugin.settings.available_languages.includes(a[0]);
			}).sort((a, b) => {
				return a[1].localeCompare(b[1])
			});

		this.language_selection.selectEl.empty();
		this.language_selection.addOption("default", '+');
		languages.forEach((code) => {
			this.language_selection.addOption(code[0], code[1]);
		});
	}

}

