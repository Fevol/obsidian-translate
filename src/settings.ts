import {App, DropdownComponent, Notice, PluginSettingTab, setIcon, Setting} from "obsidian";
import type TranslatorPlugin from "./main";
import {LanguageCode} from "iso-639-1";
import {toTitleCase} from "./util";
import {APIServiceProviders} from "./types";
import {TRANSLATION_SERVICES_INFO} from "./constants";



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
			.setDesc("Choose languages to include in translator selection")


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
				for (const service of Object.keys(TRANSLATION_SERVICES_INFO)) {
					dropdown.addOption(service, toTitleCase(service.replace('_', ' ')));
				}
				dropdown.onChange((value) => {
					this.plugin.settings.translation_service = value;
					this.plugin.setupTranslationService();
					this.plugin.saveSettings();
					document.dispatchEvent(new CustomEvent('switched-translation-service'));

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


		let title = this.service_settings.createEl('h2', {cls: 'icon-text'});
		title.style.justifyContent = 'center';
		setIcon(title, this.plugin.settings.translation_service, 22);
		title.createDiv({text: `${toTitleCase(service.replace('_', ' '))} Settings`});


		let service_data = this.plugin.settings.service_settings[service as keyof APIServiceProviders]
		if (service_data.api_key !== null) {
			let apiKeyField = new Setting(this.service_settings)
				.setName('API Key')
				.setDesc('Enter a valid API key')
				.addText((textbox) => {
					textbox.setValue(service_data.api_key);
					textbox.onChange(async (value) => {
						service_data.api_key = value;
						await this.plugin.saveSettings();
						await this.plugin.setupTranslationService();
						document.dispatchEvent(new CustomEvent('updated-translation-service'));
					});
				}).then(setting => {
					const info = TRANSLATION_SERVICES_INFO[service]
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
			this.checkValidityOfField(apiKeyField, 'API Key', '', () => {
				return this.plugin.translator.validate();
			});
		}

		// If host in settings is not null, show the host setting
		if (service_data.host !== null) {
			let hostField = new Setting(this.service_settings)
				.setName('Host')
				.setDesc('Enter the URL of the translation service')
				.addText((textbox) => {
					textbox.setValue(service_data.host);
					textbox.onChange(async (value) => {
						if (value.endsWith('/'))
							value = value.slice(0, -1);

						service_data.host = value;
						await this.plugin.saveSettings();
						await this.plugin.setupTranslationService();
						document.dispatchEvent(new CustomEvent('updated-translation-service'));
					});
				}).then(setting => {
					const info = TRANSLATION_SERVICES_INFO[service]
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
			this.checkValidityOfField(hostField, 'host', '', async () => {
				return fetch(service_data.host).then(response => {
					return response.ok;
				}).catch(() => {
					return false;
				});
			});
		}

		// Add toggle for enabling/disabling automatic translation
		let auto_translation_toggle = new Setting(this.service_settings)
			.setName('Automatic Translation')
			.setDesc('Translate text as it is being typed')
			.addToggle((toggle) => {
				toggle.setValue(service_data.auto_translate);
				toggle.onChange(async (value) => {
					service_data.auto_translate = value;
					await this.plugin.saveSettings();
					document.dispatchEvent(new CustomEvent('toggled-auto-translate'));
					document.dispatchEvent(new CustomEvent('updated-translation-service'));
				});
			});
		auto_translation_toggle.descEl.createEl('br');
		auto_translation_toggle.descEl.createSpan({cls: 'warning-text', text: "⚠ May quickly use up the API's character quota"});
	}

	checkValidityOfField(field: Setting, field_name: string, field_description: string, validation_function: () => Promise<boolean>) {

		let testbutton = createEl('button', { cls: 'icon-text'});
		// Add testbutton as first element of field's controlEl
		field.controlEl.insertBefore(testbutton, field.controlEl.firstChild);

		let icon = testbutton.createDiv();
		setIcon(icon, 'question-mark-glyph', 15);
		testbutton.createEl('span', {text: 'Test'});

		testbutton.addEventListener('click', async () => {
			icon.empty();
			icon.createDiv({cls: 'spinner'})

			// Keep only first class of testbutton
			testbutton.removeClass('translator-success');
			testbutton.removeClass('translator-error');

			let valid = await validation_function();
			icon.empty();

			if (valid) {
				testbutton.addClass('translator-success');
				new Notice(`${toTitleCase(field_name)} is valid`);
				setIcon(icon, 'check', 15);
			} else {
				testbutton.addClass('translator-error');
				new Notice(`${toTitleCase(field_name)} is not valid`);
				setIcon(icon, 'cross', 15);
			}
		})
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
				let remove_button = lang_el.createEl('span', {cls: 'setting-hotkey-icon'});
				setIcon(remove_button, 'cross', 8);

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

