import {TFile, Editor, Notice} from "obsidian";
import type TranslatorPlugin from "./main";
import t from "./l10n";

export async function translate_file(plugin: TranslatorPlugin, file: TFile, language_to: string, replace_original: boolean = false,
									 apply_glossary: boolean = false): Promise<void> {
	if (!file) {
		plugin.message_queue("No file was selected");
		return;
	}

	const file_content = await plugin.app.vault.read(file);
	if (!file_content.trim()) {
		plugin.message_queue("Selected file is empty");
	}

	let paragraphs = file_content.split("\n\n");

	let translated_text = [];
	for (let paragraph of paragraphs) {
		// Paragraph only contains formatting
		if (paragraph.trim().length === 0) {
			translated_text.push(paragraph);
		} else {
			const output = (await plugin.translator.translate(paragraph, "auto", language_to, apply_glossary));
			if (output.status_code !== 200) {
				plugin.message_queue(output.message);
				return;
			}

			translated_text.push(output.translation);
		}
	}

	if (replace_original) {
		await plugin.app.vault.modify(file, translated_text.join("\n\n"));
	} else {
		let filename = file?.name.replace(/\.[^/.]+$/, "");

		const filename_translation = (await plugin.translator.translate(filename, "auto", language_to, apply_glossary)).translation;

		const translated_filename = (!filename_translation || filename_translation === filename)
			? `[${language_to}] ${filename}`
			: filename_translation;

		const translated_document = translated_text.join("\n\n");
		const translated_document_path = (file.parent.path === '/' ? '' : file.parent.path + '/') + translated_filename + ".md";

		// If translation of file already exists, replace it by new translation
		let existing_file = plugin.app.vault.getAbstractFileByPath(translated_document_path);

		if (existing_file && existing_file instanceof TFile) {
			await plugin.app.vault.modify(existing_file, translated_document);
		} else {
			existing_file = await plugin.app.vault.create(translated_document_path, translated_document);
		}
		const leaf = plugin.app.workspace.getLeaf(false);
		// @ts-ignore (Prevent build crash)
		plugin.app.workspace.setActiveLeaf(leaf, false, true);
		await leaf.openFile(existing_file as TFile, {eState: {focus: true}});
	}
}


export async function translate_selection(plugin: TranslatorPlugin, editor: Editor, language_to: string, apply_glossary: boolean = false): Promise<void> {
	if (editor.getSelection().length === 0) {
		plugin.message_queue("Selection is empty");
		return;
	}

	let text = editor.getSelection();

	let results = await plugin.translator.translate(text, "auto", language_to, apply_glossary);
	if (results.translation)
		editor.replaceSelection(results.translation);
	if (results.message)
		plugin.message_queue(results.message);
}

export async function detect_selection(plugin: TranslatorPlugin, editor: Editor): Promise<void> {
	let selection = editor.getSelection();
	if (editor.getSelection().length === 0) {
		plugin.message_queue("Selection is empty");
		return;
	}

	let results;
	if (plugin.detector)
		results = await plugin.detector.detect(selection);
	else
		results = await plugin.translator.detect(selection);

	if (results.message)
		new Notice(results.message, 4000);

	if (results.status_code === 200) {
		const detected_languages = results.detected_languages.sort((a, b) => {
			return b.confidence - a.confidence;
		});

		if (detected_languages) {
			const alternatives = detected_languages.map((result) => {
				return `${t(result.language)}` + (result.confidence !== undefined ? ` [${(result.confidence * 100).toFixed(2)}%]` : '');
			});

			new Notice(`Detected languages:\n\t${alternatives.join('\n\t')}`, 0);
		}
	}
}
