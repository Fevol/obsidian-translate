import {ItemView, WorkspaceLeaf, App, setIcon} from "obsidian";
import TranslatorPlugin from "./main";
import {Arr} from "tern";

export const TRANSLATOR_VIEW_ID = "translator-view";

export class TranslatorView extends ItemView {
	app: App;
	plugin: TranslatorPlugin;
	left_select: HTMLSelectElement;
	right_select: HTMLSelectElement;
	service_used: HTMLElement;

	constructor(leaf: WorkspaceLeaf, app: App, plugin: TranslatorPlugin) {
		super(leaf);
		this.app = app;
		this.plugin = plugin;
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
		container.addClass("translator-view");

		let left_column = container.createDiv({'cls': 'translator-column'});

		this.left_select = left_column.createEl("select", {cls: "dropdown translator-select"});
		this.left_select.addEventListener("change", async () => {
			this.plugin.settings.language_from = this.left_select.value;
			this.plugin.saveSettings();

			output_field.value = await this.plugin.translate(input_field.value);
		});

		let input_field = left_column.createEl("textarea", {cls: "translator-textarea"})
		input_field.addEventListener("input", async () => {
			output_field.value = await this.plugin.translate(input_field.value);
		});

		let center_column = container.createDiv({'cls': 'translator-button-container'});

		let switch_btn = center_column.createEl('button', {cls: "translator-button"});
		setIcon(switch_btn, 'switch', 20);
		switch_btn.addEventListener("click", () => {
			[this.left_select.value, this.right_select.value] = [this.right_select.value, this.left_select.value];
			[input_field.value, output_field.value] = [output_field.value, input_field.value];

			this.plugin.settings.language_from = this.left_select.value;
			this.plugin.settings.language_to = this.right_select.value;
			this.plugin.saveSettings();
		});

		let right_column = container.createDiv({'cls': 'translator-column'});

		this.right_select = right_column.createEl("select", {cls: "dropdown translator-select"});
		this.right_select.addEventListener("change", async () => {
			this.plugin.settings.language_to = this.right_select.value;
			this.plugin.saveSettings();
			output_field.value = await this.plugin.translate(input_field.value);
		});
		let output_field = right_column.createEl("textarea", {cls: "translator-textarea"})

		this.service_used = container.createDiv({'cls': 'translator-service-text icon-text'});
		await this.updateTooltip();

		document.addEventListener("translation-service-changed", () => {
			this.updateTooltip();
		});

		document.addEventListener("updated-language-selection", () => {
			if (!this.plugin.settings.available_languages.contains(this.plugin.settings.language_to))
				this.plugin.settings.language_to = '';

			if (!this.plugin.settings.available_languages.contains(this.plugin.settings.language_from))
				this.plugin.settings.language_from = '';

			this.updateSelection(this.left_select, "from");
			this.updateSelection(this.right_select, "to");
			this.plugin.saveSettings();
		});
	}


	updateSelection(dropdown: HTMLSelectElement, side: string) {
		dropdown.empty();
		const languages = Array.from(this.plugin.settings.available_languages).map((code) => {
			return [code, this.plugin.all_languages.get(code)];
		}).sort((a, b) => {
			return a[1].localeCompare(b[1]);
		});

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
		} else if (this.plugin.settings.available_languages.length === 1 || !opposite_value) {
			dropdown.value = this.plugin.settings.available_languages[0];
		} else {
			dropdown.value = this.plugin.settings.available_languages[
				this.plugin.settings.available_languages[0] === opposite_value ? 1 : 0];
		}
		// @ts-ignore (Again, should be alright)
		this.plugin.settings[`language_${side}`] = dropdown.value;
	}

	async updateTooltip() {
		this.service_used.empty();
		let icon = this.service_used.createDiv();
		setIcon(icon, this.plugin.settings.translation_service);
		let span = this.service_used.createDiv({
			cls: '',
			text: `Using ${this.plugin.settings.translation_service.replace('_', ' ')}`
		});

		this.updateSelection(this.left_select, "from");
		this.updateSelection(this.right_select, "to");
		await this.plugin.saveSettings();
	}

	async onClose() {
		// Nothing to clean up.
	}
}
