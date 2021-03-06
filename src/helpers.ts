import {TFile, Editor, Notice} from "obsidian";
import type TranslatorPlugin from "./main";
import t from "./l10n";


export async function translate_file(plugin: TranslatorPlugin, file: TFile,
									 language_to: string, replace_original: boolean = false): Promise<void> {
	if (!file) {
		plugin.message_queue("No file was selected");
		return;
	}

	let file_content = await plugin.app.vault.read(file);
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
			let translation = (await plugin.translator.translate(paragraph, "auto", language_to)).translation;
			translated_text.push(translation);
		}
	}

	if (replace_original) {
		await plugin.app.vault.modify(file, translated_text.join("\n\n"));
	} else {
		let filename = 	file?.name.replace(/\.[^/.]+$/, "");

		let filename_translation = (await plugin.translator.translate(filename, 'auto', language_to)).translation;
		let translated_filename = !filename_translation || filename_translation === filename
			? `[${language_to}] ${filename}`
			: filename_translation;

		let translated_document = translated_text.join("\n\n");
		let translated_document_path = (file.parent.path === '/' ? '' : file.parent.path + '/') + translated_filename + ".md";

		// If translation of file already exists, replace it by new translation
		let existing_file = plugin.app.vault.getAbstractFileByPath(translated_document_path);

		if(existing_file && existing_file instanceof TFile) {
			await plugin.app.vault.modify(existing_file, translated_document);
		}
		else {
			existing_file = await plugin.app.vault.create(translated_document_path, translated_document);
		}
		let leaf = plugin.app.workspace.getLeaf(false);
		plugin.app.workspace.setActiveLeaf(leaf, false);
		leaf.openFile(existing_file as TFile, { eState: { focus: true } });
	}
}


export async function translate_selection(plugin: TranslatorPlugin, editor: Editor, language_to: string): Promise<void> {
	if (editor.getSelection().length === 0) {
		plugin.message_queue("Selection is empty");
		return;
	}
	let results = await plugin.translator.translate(editor.getSelection(), 'auto', language_to);
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

	results = results.sort((a, b) => {
		return b.confidence - a.confidence;
	});

	let main = results.shift();

	if (main.message)
		new Notice(main.message, 4000);

	if (main.language) {
		let alternatives = results.map((result) => {
			return `${t(result.language)}` + (result.confidence !== undefined ? ` [${(result.confidence * 100).toFixed(2)}%]` : '');
		}).join("\n\t");

		alternatives = (alternatives ? "\nAlternatives:\n\t" : "") + alternatives;

		new Notice(`Detected language:\n\t${t(main.language)}` +
			(main.confidence !== undefined ? ` [${(main.confidence * 100).toFixed(2)}%]` : '') + alternatives, 0);
	}
}
