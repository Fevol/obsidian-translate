import {App, ButtonComponent, DropdownComponent, Notice, PluginSettingTab, setIcon, Setting} from "obsidian";
import type TranslatorPlugin from "./main";
import {LanguageCode} from "iso-639-1";
import {toTitleCase} from "./util";
import {randomInt} from "crypto";


const translation_services_list = {
	"google_translate": {
		request_key: "https://cloud.google.com/translate/docs/setup",
	},
	"bing_translator": {
		request_key: "https://www.microsoft.com/en-us/translator/business/translator-api/",
	},
	"yandex_translate": {
		request_key: "https://yandex.com/dev/translate/",
	},
	"deepl": {
		request_key: "https://www.deepl.com/pro-api?cta=header-pro-api/",
	},
	"libre_translate": {
		local_host: "https://github.com/LibreTranslate/LibreTranslate",
	}
}

// There is currently no way to catch when the display language of Obsidian is being changed, as it is not reactive
// (add current display language to app.json?)
// So 'display languages' setting will only be applied correctly when the program is fully restarted or when
// the language display name setting is changed.

export class TranslatorSettingsTab extends PluginSettingTab {
	plugin: TranslatorPlugin;
	language_view: HTMLElement;
	language_selection: DropdownComponent;
	service_settings: HTMLElement;

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
					document.dispatchEvent(new CustomEvent('updated-language-selection'));
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

					if (value) {
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
						this.plugin.settings.available_languages = [...this.plugin.settings.selected_languages];
					}

					await this.plugin.saveSettings();
					this.updateLanguageView();
					document.dispatchEvent(new CustomEvent('updated-language-selection'));
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
					document.dispatchEvent(new CustomEvent('updated-language-selection'));
				});
				dropdown.setValue(this.plugin.settings.display_language);
			});

		let translation_services = new Setting(this.containerEl)
			.setName("Translation Service")
			.addDropdown(async (dropdown) => {
				for (const service of Object.keys(translation_services_list)) {
					dropdown.addOption(service, toTitleCase(service.replace('_', ' ')));
				}
				dropdown.onChange((value) => {
					this.plugin.settings.translation_service = value;
					this.plugin.setupTranslationService();
					this.plugin.saveSettings();
					document.dispatchEvent(new CustomEvent('translation-service-changed'));

					// Reveal correspondings settings tab for the selected service
					this.showServiceSettings(value);
				});
				dropdown.setValue(this.plugin.settings.translation_service);
			});
		this.service_settings = containerEl.createDiv();
		this.showServiceSettings(this.plugin.settings.translation_service);
	}

	showServiceSettings(service: string) {
		this.service_settings.empty();

		this.service_settings.createEl('h2', {text: `${toTitleCase(service.replace('_', ' '))} Settings`});

		// @ts-ignore
		if (this.plugin.settings.service_settings[service].api_key !== null) {
			let apiKeyField = new Setting(this.service_settings)
				.setName('API Key')
				.setDesc('Enter a valid API key')
				.addText((textbox) => {
					// @ts-ignore
					textbox.setValue(this.plugin.settings.service_settings[service].api_key);
					textbox.onChange((value) => {
						// @ts-ignore
						this.plugin.settings.service_settings[service].api_key = value;
						this.plugin.saveSettings();
						this.plugin.setupTranslationService();
					});
				}).then(setting => {
				//@ts-ignore
				const info = translation_services_list[service]
				if ('request_key' in info) {
					setting.descEl.createEl('br');
					let href = setting.descEl.createEl('a', {
						cls: 'icon-text',
						href: info.request_key,
					})
					let icon = href.createDiv();
					setIcon(icon, 'info', 15);
					href.createEl('span', {text: 'Setup for API Key can be found here'});
				}
			});
			let api_icon = apiKeyField.controlEl.createDiv({cls: 'rounded-icon'})
			setIcon(api_icon, 'question-mark-glyph', 15);

			let testkey = new Setting(this.service_settings)
				.setName('Test the API key')

			let testbutton = testkey.controlEl.createEl('button', {cls: 'icon-text'})
			let icon = testbutton.createDiv();
			setIcon(icon, 'question-mark-glyph', 15);
			testbutton.createEl('span', {text: 'Test'});

			testbutton.addEventListener('click', async () => {
				// let test = await this.plugin.translate('Test', 'en', 'en');
				// TODO: Add stub for translation service and run test
				api_icon.empty();
				icon.empty();

				if (Math.random() > 0.5) {
					new Notice('[STUB] API key is valid');
					setIcon(icon, 'check', 15);
					setIcon(api_icon, 'check', 15);
					api_icon.style.backgroundColor = 'darkgreen';
					testbutton.style.backgroundColor = 'darkgreen';
				} else {
					new Notice('[STUB] API key is invalid');
					setIcon(icon, 'cross', 15);
					setIcon(api_icon, 'cross', 15);
					api_icon.style.backgroundColor = 'darkred';
					testbutton.style.backgroundColor = 'darkred';
				}
			})
		}

		// If host in settings is not null, show the host setting
		// @ts-ignore
		if (this.plugin.settings.service_settings[service].host !== null) {
			new Setting(this.service_settings)
				.setName('Host')
				.setDesc('Enter the URL of the translation service')
				.addText((textbox) => {
					// @ts-ignore
					textbox.setValue(this.plugin.settings.service_settings[service].host);
					textbox.onChange((value) => {
						if (value.endsWith('/'))
							value = value.slice(0, -1);

						// @ts-ignore
						this.plugin.settings.service_settings[service].host = value;
						this.plugin.saveSettings();
						this.plugin.setupTranslationService();
					});
				}).then(setting => {
				//@ts-ignore
				const info = translation_services_list[service]
				if ('local_host' in info) {
					setting.descEl.createEl('br');
					let href = setting.descEl.createEl('a', {
						cls: 'icon-text',
						href: info.local_host,
					})
					let icon = href.createDiv();
					setIcon(icon, 'info', 15);
					href.createEl('span', {text: 'You can host this service locally'});
				}
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
				let remove_button = lang_el.createDiv();
				setIcon(remove_button, 'cross');
				remove_button.addClass('setting-hotkey-icon')

				remove_button.addEventListener('click', async () => {
					this.plugin.settings.selected_languages.remove(code);
					this.plugin.settings.available_languages.remove(code);
					await this.plugin.saveSettings();
					this.updateLanguageView();
					this.updateLanguageSelection();
					document.dispatchEvent(new CustomEvent('updated-language-selection'));
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

