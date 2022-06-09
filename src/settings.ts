import {addIcon, App, DropdownComponent, Notice, PluginSettingTab, setIcon, Setting} from "obsidian";
import type TranslatorPlugin from "./main";
import type {LanguageCode} from "iso-639-1";
import {toTitleCase} from "./util";
import type {APIServiceProviders, APIServiceSettings} from "./types";
import {AUTO_TRANSLATE_INTERVALS, TRANSLATION_SERVICES_INFO} from "./constants";
import type ToggleButton from "./ui/ToggleButton.svelte";
import type {SvelteComponent} from "svelte";
import SettingsPage from "./ui/SettingsPage.svelte";


// There is currently no way to catch when the display language of Obsidian is being changed, as it is not reactive
// (add current display language to app.json?)
// So 'display languages' setting will only be applied correctly when the program is fully restarted or when
// the language display name setting is changed.

export class TranslatorSettingsTab extends PluginSettingTab {
	plugin: TranslatorPlugin;
	// language_view: HTMLElement;
	// language_selection: DropdownComponent;
	// service_settings: HTMLElement;
	// spellchecker_languages: string[];
	// validate_button: ToggleButton;
	view: SvelteComponent;

	constructor(app: App, plugin: TranslatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		// this.plugin.settings_page = this;

		// @ts-ignore



		// this.updateAvailableLanguages();
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		this.view = new SettingsPage({
			target: containerEl,
			props: {
				plugin: this.plugin,
				settings: this.plugin.settings,
				data: this.plugin.plugin_data,
			}
		});


		// let select_languages = new Setting(this.containerEl)
		// 	.setName("Translator languages")
		// 	.setDesc("Choose languages to include in translator selection")
		//
		//
		// this.language_view = select_languages.controlEl.createDiv({cls: 'setting-command-hotkeys'});
		// this.updateLanguageView();
		//
		// select_languages.addDropdown((dropdown) => {
		// 	this.language_selection = dropdown;
		// 	this.updateLanguageSelection();
		//
		// 	dropdown.onChange(async (code) => {
		// 		// If not default, or language was already selected, add it to the list
		// 		if (code !== "default" && !this.plugin.settings.selected_languages.includes(code)) {
		// 			// Add language to list of selected languages (persistent)
		// 			this.plugin.settings_listener.selected_languages.push(code);
		// 		}
		// 	});
		// });
		//
		// new Setting(this.containerEl)
		// 	.setName("Sync with spellchecker languages")
		// 	.addToggle((toggle) => {
		// 		toggle.setValue(this.plugin.settings.use_spellchecker_languages);
		//
		// 		toggle.onChange(async (value) => {
		// 			select_languages.setDisabled(value);
		// 			this.plugin.settings_listener.use_spellchecker_languages = value;
		// 		});
		// 	});
		//
		// new Setting(this.containerEl)
		// 	.setName("Filter languages")
		// 	.setDesc("Only display languages supported by the translation service")
		// 	.addToggle((toggle) => {
		// 		toggle.setValue(this.plugin.settings.filter_service_languages);
		// 		toggle.onChange(async (value) => {
		// 			this.plugin.settings_listener.filter_service_languages = value;
		// 		});
		// 	})
		//
		// new Setting(this.containerEl)
		// 	.setName("Language display name")
		// 	.setDesc("Select in which language the language name should be displayed")
		// 	.addDropdown(async (dropdown) => {
		// 		dropdown.addOption("display", 'Display Language');
		// 		dropdown.addOption("local", 'Localised Language');
		// 		dropdown.onChange((value) => {
		// 			this.plugin.settings_listener.display_language = value;
		// 		});
		// 		dropdown.setValue(this.plugin.settings.display_language);
		// 	});
		//
		// let translation_services = new Setting(this.containerEl)
		// 	.setName("Translation Service")
		// 	.addDropdown(async (dropdown) => {
		// 		for (const service of Object.keys(TRANSLATION_SERVICES_INFO)) {
		// 			dropdown.addOption(service, toTitleCase(service.replace('_', ' ')));
		// 		}
		// 		dropdown.onChange((value) => {
		// 			this.plugin.settings_listener.translation_service = value;
		// 		});
		// 		dropdown.setValue(this.plugin.settings.translation_service);
		// 	});
		// this.service_settings = containerEl.createDiv();
		// this.showServiceSettings(this.plugin.settings.translation_service);
	}

	hide(): any {
		super.hide();
		this.view.$destroy();
	}


	// showServiceSettings(service: string) {
	// 	this.service_settings.empty();
	//
	// 	let title = this.service_settings.createEl('h2', {cls: 'icon-text'});
	// 	title.style.justifyContent = 'center';
	// 	setIcon(title, this.plugin.settings.translation_service, 22);
	// 	title.createDiv({text: `${toTitleCase(service.replace('_', ' '))} Settings`});
	//
	// 	// TODO: Rework this to combine test button for api key, region and host
	// 	if (this.plugin.service_data.api_key !== null) {
	// 		let apiKeyField = new Setting(this.service_settings)
	// 			.setName('API Key')
	// 			.setDesc('Enter a valid API key');
	//
	// 		let apiAuthentication = apiKeyField.controlEl.createDiv({cls: 'translator-column'});
	//
	// 		let apikeyfield = apiAuthentication.createEl('input', {
	// 			type: 'text',
	// 			value: this.plugin.service_data.api_key,
	// 			placeholder: 'API Key',
	// 		});
	//
	// 		apikeyfield.addEventListener('input', (e) => {
	// 			this.plugin.settings_listener.service_settings[service].api_key = apikeyfield.value;
	// 		});
	//
	// 		const info = TRANSLATION_SERVICES_INFO[service]
	// 		if ('request_key' in info) {
	// 			apiKeyField.descEl.createEl('br');
	// 			let href = apiKeyField.descEl.createEl('a', {
	// 				// cls: 'icon-text',
	// 				href: info.request_key,
	// 				text: '🛈 Setup for API Key can be found here'
	// 			})
	// 			// let icon = href.createDiv();
	// 			// setIcon(icon, 'info', 15);
	// 			// href.createEl('span', {text: '🛈 Setup for API Key can be found here'});
	// 		}
	//
	// 		if (this.plugin.service_data.region !== null) {
	// 			let regionfield = apiAuthentication.createEl('select', {
	// 				cls: 'dropdown',
	// 				value: this.plugin.service_data.region,
	// 			});
	// 			regionfield.createEl('option', {value: '', text: 'Global'});
	// 			for (const region of info.region_options) {
	// 				regionfield.createEl('option', {
	// 					value: region.value,
	// 					text: region.text
	// 				});
	// 			}
	// 			regionfield.addEventListener('change', (e) => {
	// 				this.plugin.settings_listener.service_settings[service].region = regionfield.value;
	// 			});
	// 		}
	//
	//
	// 		this.checkValidityOfField(apiKeyField, 'API Key', '', () => {
	// 			return this.plugin.service_data.api_key && this.plugin.translator.validate();
	// 		});
	// 	}
	//
	// 	// If host in settings is not null, show the host setting
	// 	if (this.plugin.service_data.host !== null) {
	// 		let hostField = new Setting(this.service_settings)
	// 			.setName('Host')
	// 			.setDesc('Enter the URL of the translation service')
	// 			.addText((textbox) => {
	// 				textbox.setValue(this.plugin.service_data.host);
	// 				textbox.onChange(async (value) => {
	// 					if (value.endsWith('/'))
	// 						value = value.slice(0, -1);
	//
	// 					this.plugin.settings_listener.service_settings[service].host = value;
	// 				});
	// 			}).then(setting => {
	// 				const info = TRANSLATION_SERVICES_INFO[service]
	// 				if ('local_host' in info) {
	// 					setting.descEl.createEl('br');
	// 					let href = setting.descEl.createEl('a', {
	// 						// cls: 'icon-text',
	// 						text: '🛈 You can host this service locally',
	// 						href: info.local_host,
	// 					})
	// 					// let icon = href.createDiv();
	// 					// setIcon(icon, 'info', 15);
	// 					// href.createEl('span', {text: 'You can host this service locally'});
	// 				}
	// 			});
	// 		this.checkValidityOfField(hostField, 'host', '', async () => {
	// 			return this.plugin.service_data.host && fetch(this.plugin.service_data.host).then(response => {
	// 				return response.ok;
	// 			}).catch(() => {
	// 				return false;
	// 			});
	// 		});
	// 	}
	//
	// 	// Add toggle for enabling/disabling automatic translation
	// 	let auto_translation_toggle = new Setting(this.service_settings)
	// 		.setName('Automatic Translation')
	// 		.setDesc('Translate text as it is being typed')
	// 		.addToggle((toggle) => {
	// 			toggle.setValue(this.plugin.service_data.auto_translate);
	// 			toggle.onChange(async (value) => {
	// 				this.plugin.settings_listener.service_settings[service].auto_translate = value;
	// 			});
	// 		});
	// 	auto_translation_toggle.descEl.createEl('br');
	// 	auto_translation_toggle.descEl.createSpan({
	// 		cls: 'warning-text',
	// 		text: "⚠ May quickly use up the API's character quota"
	// 	});
	//
	// 	let auto_translation_interval = new Setting(this.service_settings)
	// 		.setName('Interval')
	// 		.setDesc('How long after typing to translate the text')
	// 		.addDropdown((dropdown) => {
	// 			dropdown.setValue(this.plugin.service_data.auto_translate_interval);
	// 			for (const interval of AUTO_TRANSLATE_INTERVALS) {
	// 				dropdown.addOption(interval.value, interval.text);
	// 			}
	//
	// 			dropdown.onChange(async (value) => {
	// 				this.plugin.settings_listener.service_settings[service].auto_translate_interval = value;
	// 			});
	// 		});
	//
	// 	// FIXME: Determine whether this toggle gets to stay
	// 	//  The only reason it exists, is to make sure that if the services add new languages that can be translated to,
	// 	//  the user has the ability to let the plugin know about it. Otherwise, the program would have to fetch the
	// 	//  list of languages from the service, which would eat away the user's quota.
	// 	// Add button for updating available languages for selected translation service
	// 	let update_languages_button = new Setting(this.service_settings)
	// 		.setName('Update Languages')
	// 		.setDesc('Update the list of available languages')
	// 		.addButton((button) => {
	// 			button.setIcon('switch');
	// 			button.onClick(async () => {
	// 				try {
	// 					this.plugin.settings_listener.service_settings[service].available_languages = await this.plugin.translator.get_languages();
	// 					console.log(this.plugin.settings_listener.service_settings[service].available_languages);
	// 					new Notice('Language selection updated');
	// 				} catch (e) {
	// 					new Notice('Failed to fetch languages, check host or API key');
	// 				}
	// 			});
	// 		});
	//
	//
	// }
	//
	// async onClose() {
	// 	this.validate_button.$destroy();
	// }
	//
	// checkValidityOfField(field: Setting, field_name: string, field_description: string, validation_function: () => Promise<boolean>) {
	// 	this.validate_button = new ToggleButton({
	// 		target: field.controlEl,
	// 		props: {
	// 			value: this.plugin.settings.service_settings[this.plugin.settings.translation_service as keyof APIServiceProviders].validated,
	// 			text: 'Test',
	// 			size: 15,
	// 			fn: validation_function,
	// 		},
	// 	})
	//
	// 	// this.validate_button = createEl('button', {cls: 'icon-text'});
	// 	// // Add testbutton as first element of field's controlEl
	// 	// field.controlEl.insertBefore(this.validate_button, field.controlEl.firstChild);
	// 	//
	// 	// this.validate_button_icon = this.validate_button.createDiv();
	// 	// this.setButtonStatus(this.validate_button, this.validate_button_icon, this.plugin.service_data.validated);
	// 	// this.validate_button.createEl('span', {text: 'Test'});
	// 	//
	// 	// this.validate_button.addEventListener('click', async () => {
	// 	// 	this.setButtonStatus(this.validate_button, this.validate_button_icon, 'loading');
	// 	//
	// 	// 	let valid = await validation_function();
	// 	// 	this.setButtonStatus(this.validate_button, this.validate_button_icon, valid);
	// 	//
	// 	// 	this.plugin.settings_listener.service_settings[this.plugin.settings.translation_service].validated = valid;
	// 	// 	new Notice(`${toTitleCase(field_name)} is ${valid ? 'valid' : 'not valid'}`);
	// 	// })
	// }
	//
	// // setButtonStatus(button: HTMLButtonElement, icon: HTMLElement, status: any) {
	// // 	icon.empty();
	// // 	button.removeClass('translator-success');
	// // 	button.removeClass('translator-fail');
	// // 	if (typeof status === 'boolean') {
	// // 		button.addClass(`translator-${status ? 'success' : 'fail'}`);
	// // 		setIcon(icon, status ? 'check' : 'cross', 15);
	// // 	} else if (status === 'loading') {
	// // 		icon.createDiv({cls: 'spinner'})
	// // 	} else {
	// // 		setIcon(icon, 'question-mark-glyph', 15);
	// // 	}
	// // }
	//
	// updateAvailableLanguages(): void {
	// 	this.plugin.available_languages = this.plugin.settings.use_spellchecker_languages ? this.spellchecker_languages : this.plugin.settings.selected_languages;
	// 	if (this.plugin.settings.filter_service_languages) {
	// 		this.plugin.available_languages = this.plugin.available_languages.filter((a) => {
	// 			return this.plugin.service_data.available_languages.contains(a);
	// 		});
	// 	}
	// }
	//
	// updateLanguageView(): void {
	// 	this.language_view.empty();
	//
	// 	let languages = Array.from(this.plugin.available_languages).map((code) => {
	// 		return [code, this.plugin.all_languages.get(code)];
	// 	}).sort((a, b) => {
	// 		return a[1].localeCompare(b[1]);
	// 	});
	//
	//
	// 	for (let [code, lang] of languages) {
	// 		let lang_el = this.language_view.createEl('span', {
	// 			text: this.plugin.all_languages.get(code),
	// 			cls: 'setting-hotkey'
	// 		});
	// 		if (!this.plugin.settings.use_spellchecker_languages) {
	// 			let remove_button = lang_el.createEl('span', {cls: 'setting-hotkey-icon'});
	// 			setIcon(remove_button, 'cross', 8);
	//
	// 			remove_button.addEventListener('click', async () => {
	// 				this.plugin.settings_listener.selected_languages.remove(code);
	// 			});
	// 		}
	// 	}
	// }
	//
	// updateLanguageSelection(): void {
	// 	// Available languages are all the languages that are not selected
	//
	// 	// Filter from all languages the ones that are not selected
	// 	let languages: [string, string][] = [...this.plugin.all_languages.entries()]
	// 		.filter((a) => {
	// 			return !this.plugin.available_languages.includes(a[0]);
	// 		});
	//
	// 	if (this.plugin.settings.filter_service_languages) {
	// 		languages = languages.filter((a) => {
	// 			return this.plugin.service_data.available_languages.includes(a[0]);
	// 		});
	// 	}
	//
	// 	languages = languages.sort((a, b) => {
	// 		return a[1].localeCompare(b[1])
	// 	});
	//
	// 	this.language_selection.selectEl.empty();
	// 	this.language_selection.addOption("default", '+');
	// 	languages.forEach((code) => {
	// 		this.language_selection.addOption(code[0], code[1]);
	// 	});
	// }
}

