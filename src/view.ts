import {ItemView, WorkspaceLeaf, App, setIcon} from "obsidian";
import TranslatorPlugin from "./main";
import {ICONS, TRANSLATOR_VIEW_ID, TRANSLATION_SERVICES_INFO} from "./constants";
import {APIServiceProviders} from "./types";
import {getKeyValue} from "./util";

export class TranslatorView extends ItemView {
	app: App;
	plugin: TranslatorPlugin;
	left_select: HTMLSelectElement;
	right_select: HTMLSelectElement;
	input_field: HTMLTextAreaElement;
	output_field: HTMLTextAreaElement;

	translate_button: HTMLButtonElement;

	service_used: HTMLElement;

	constructor(leaf: WorkspaceLeaf, app: App, plugin: TranslatorPlugin) {
		super(leaf);
		this.app = app;
		this.plugin = plugin;
		plugin.view_page = this;
	}

	getViewType() {
		return TRANSLATOR_VIEW_ID;
	}

	getDisplayText() {
		return "Translator";
	}

	getIcon(): string {
		return "translate";
	}


	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		// TODO: On resize, check whether to change the translator view
		container.addClass("translator-view");


		// ----------------------------------  Left Column  ----------------------------------
		let left_column = container.createDiv({'cls': 'translator-column'});

		this.left_select = left_column.createEl("select", {cls: "dropdown translator-select"});
		this.left_select.addEventListener("change", async () => {
			this.plugin.settings_listener.language_from = this.left_select.value;
		});

		// TODO: Make the field resizable (save data)
		this.input_field = left_column.createEl("textarea", {cls: "translator-textarea"})
		// TODO: Event should only be triggered when the user is done typing (?) (count delay)
		this.input_field.addEventListener("input", async () => {
			if (this.plugin.service_data.auto_translate) {
				await this.translate();
			}
		});
		// -----------------------------------------------------------------------------------



		// ------------------  Center Column (Switch Languages, Translate)  ------------------
		let center_column = container.createDiv({'cls': 'translator-button-container'});

		let switch_btn = center_column.createEl('button', {cls: "translator-button"});
		setIcon(switch_btn, 'switch', 20);
		switch_btn.addEventListener("click", () => {
			if (this.left_select.value === 'auto') {
				this.left_select.value = this.plugin.detected_language;
				this.left_select.childNodes[0].textContent = 'Detect Language';
			}

			[this.left_select.value, this.right_select.value] = [this.right_select.value, this.left_select.value];
			[this.input_field.value, this.output_field.value] = [this.output_field.value, this.input_field.value];

			this.plugin.settings.language_from = this.left_select.value;
			this.plugin.settings.language_to = this.right_select.value;
			this.plugin.saveSettings();
		});

		this.translate_button = center_column.createEl('button', {cls: "translator-button"});
		setIcon(this.translate_button, 'translate', 20);
		this.translate_button.addEventListener("click", async () => {
			await this.translate();
		});

		// If auto translate is disabled, the button will not be displayed
		let auto_translate = this.plugin.service_data.auto_translate;
		this.translate_button.classList.toggle("hide-element", auto_translate);

		// -----------------------------------------------------------------------------------



		// ----------------------------------  Right Column  ---------------------------------
		let right_column = container.createDiv({'cls': 'translator-column'});

		this.right_select = right_column.createEl("select", {cls: "dropdown translator-select"});
		this.right_select.addEventListener("change", async () => {
			this.plugin.settings_listener.language_to = this.right_select.value;
		});
		this.output_field = right_column.createEl("textarea", {cls: "translator-textarea"})
		this.output_field.setAttribute("readonly", "true");
		// -----------------------------------------------------------------------------------


		this.service_used = container.createDiv({'cls': 'translator-service-text'});
		await this.updateTooltip();
	}

	updateLanguageSelection() {
		if (!this.plugin.available_languages.contains(this.plugin.settings.language_to))
			this.plugin.settings.language_to = '';

		if (!this.plugin.available_languages.contains(this.plugin.settings.language_from))
			this.plugin.settings.language_from = '';

		this.updateSelection(this.left_select, "from");
		this.updateSelection(this.right_select, "to");
		this.plugin.saveSettings();
	}

	updateSelection(dropdown: HTMLSelectElement, side: string) {
		dropdown.empty();
		let languages = Array.from(this.plugin.available_languages).map((code) => {
			return [code, this.plugin.all_languages.get(code)];
		}).sort((a, b) => {
			return a[1].localeCompare(b[1]);
		});

		if (side === "from") {
			// Add the default language to the top of the list
			languages.unshift(['auto', 'Detect Language']);
		}

		for (const [locale, name] of languages) {
			let option = dropdown.createEl("option", {
				value: locale,
				text: name
			});
		}

		// @ts-ignore (Should be alright)
		let initial_value: string = this.plugin.settings[`language_${side}`];
		let opposite_value = this.plugin.settings[`language_${side === "from" ? "to" : "from"}`];

		if (initial_value) {
			dropdown.value = initial_value;
		} else if (this.plugin.available_languages.length === 1 || !opposite_value) {
			dropdown.value = this.plugin.available_languages[0];
		} else {
			dropdown.value = this.plugin.available_languages[
				this.plugin.available_languages[0] === opposite_value ? 1 : 0];
		}
		// @ts-ignore (Again, should be alright)
		this.plugin.settings[`language_${side}`] = dropdown.value;
	}

	async updateTooltip() {
		this.service_used.empty();

		let icon_container = this.service_used.createDiv({'cls': 'icon-text'});

		let icon = icon_container.createDiv();

		setIcon(icon, this.plugin.settings.translation_service);
		let span = icon_container.createEl('a',{
			cls: '',
			text: `Using ${this.plugin.settings.translation_service.replace('_', ' ')}`,
			href: TRANSLATION_SERVICES_INFO[this.plugin.settings.translation_service].url
		});

		this.updateSelection(this.left_select, "from");
		this.updateSelection(this.right_select, "to");
		await this.plugin.saveSettings();

		if ('attribution' in TRANSLATION_SERVICES_INFO[this.plugin.settings.translation_service]) {
			let attribution_icon = this.service_used.createDiv();

			// @ts-ignore
			attribution_icon.innerHTML = ICONS[TRANSLATION_SERVICES_INFO[this.plugin.settings.translation_service].attribution];

			// Get the icon from service_used
			let attribution = attribution_icon.children[0];

			// Scale the icon by a factor of 1.5
			let width: number, height: number;
			[width, height] = attribution.getAttribute("viewBox").split(" ").splice(2).map((x) => parseInt(x));

			let scaleX = 160 / width,
				scaleY = 40 / height;
			let scale = Math.min(scaleX, scaleY);

			attribution.setAttribute("width", (width * scale).toString());
			attribution.setAttribute("height", (height * scale).toString());

		}
	}

	async translate(): Promise<void> {
		if (this.plugin.settings.language_to === this.plugin.settings.language_from || !/[a-zA-Z]/g.test(this.input_field.value)) {
			this.output_field.value = this.input_field.value;
			return;
		}

		// TODO: Add validation for the translator, n tries before blocking the service and forcing change of settings
		let return_values = await this.plugin.translator.translate(this.input_field.value, this.plugin.settings.language_from, this.plugin.settings.language_to);

		if (this.plugin.settings.language_from === "auto") {
			this.left_select.childNodes[0].textContent = `Detect Language (${this.plugin.all_languages.get(return_values.detected_language)})`;
			this.plugin.detected_language = return_values.detected_language;
		}
		this.output_field.value = return_values.translation;
	}

	async onClose() {
		// Nothing to clean up.
	}

}
