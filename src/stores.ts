import {writable} from "svelte/store";
import {
	type TranslatorPluginSettings,
	type ModelFileData,
	type TranslatorServiceType,
	type DetectorServiceType,
	ALL_DETECTOR_SERVICES,
	ALL_TRANSLATOR_SERVICES
} from "./types";
import type TranslatorPlugin from "./main";

/**
 * The store for the plugin settings.
 */
export const settings = writable<TranslatorPluginSettings>();

/**
 * A cache of the available language locales, and their corresponding names
 */
export const all_languages = writable<Map<string, string>>(new Map());

/**
 * Set of languages that can be translated to and from for the default/global translation service (with filters applied)
 */
export const available_languages = writable<string[]>([]);

/**
 * Set of translator services that can be accessed in settings, commands, etc.
 */
export const available_translator_services = writable<TranslatorServiceType[]>([...ALL_TRANSLATOR_SERVICES]);

/**
 * Set of detector services that can be accessed in settings, commands, etc.
 */
export const available_detector_services = writable<DetectorServiceType[]>([...ALL_DETECTOR_SERVICES]);

/**
 * Set of languages that are used for spellchecking Obsidian
 */
export const spellcheck_languages = writable<string[]>([]);

/**
 * The currently selected tab of the settings page
 */
export const settings_tab = writable<string>("general");

/**
 * Whether any of the services API keys are still encrypted (due to password not being entered yet)
 */
export const passwords_are_encrypted = writable<boolean>(false);

/**
 * The password used to encrypt/decrypt the API keys
 */
export const password = writable<string>("");

/**
 * The list of FastText models and the binary currently downloaded in the vault
 */
export const fasttext_data = writable<ModelFileData>();

/**
 * The list of Bergamot models and the binary currently downloaded in the vault
 */
export const bergamot_data = writable<ModelFileData>();

/**
 * Determines whether the shortcut tooltips should be hidden
 */
export const hide_shortcut_tooltips = writable<boolean>(false);

/**
 * Globally accessible instance of glossary data
 */
export const glossary = {
	dicts: {},
	replacements: {},
	source_language: "",
	target_language: "",
	text: ["", ""],
}

// FIXME: Is it better to access via app.plugins.plugins[plugin_id]?
export const globals = {
	plugin: null as null | TranslatorPlugin ,
}
