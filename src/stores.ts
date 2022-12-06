import {writable, type Writable} from "svelte/store";
import type {TranslatorPluginSettings, ModelFileData} from "./types";
import type TranslatorPlugin from "./main";
import {ALL_SERVICES} from "./constants";

export const settings = writable<TranslatorPluginSettings>();

// Cache the available language locales, and their corresponding names
export const all_languages = writable<Map<string, string>>(new Map());

// Which languages can be translated to and from for default translation service (with filters applied)
export const available_languages = writable<string[]>([]);

// Determines which services will be visible in the settings, modals, ...
export const available_services = writable<string[]>(ALL_SERVICES);

// Current spellchecker languages (synced at startup of the plugin)
export const spellcheck_languages = writable<string[]>([]);

// Selected tab of the settings page
export const settings_tab = writable<string>("general");

// If any of the services API keys are still encrypted, this will be true
export const passwords_are_encrypted = writable<boolean>(false);

// Password used to encrypt/decrypt the API keys
export const password = writable<string>("");

// FastText data currently stored in the vault
export const fasttext_data = writable<ModelFileData>();

// Bergamot data currently stored in the vault
export const bergamot_data = writable<ModelFileData>();


export let hide_shortcut_tooltips = writable<boolean>(false);

export const glossary = {
	dicts: {},
	replacements: {},
	source_language: "",
	target_language: "",
	text: ["", ""],
}

// FIXME: Is it better to access via app.plugins.plugins[plugin_id]?
export const globals = {
	plugin: null as TranslatorPlugin,
}
