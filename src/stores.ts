import {writable, type Writable} from "svelte/store";
import type {TranslatorPluginSettings, PluginData} from "./types";
import type TranslatorPlugin from "./main";

export const settings = writable<TranslatorPluginSettings>();
export const data = writable<PluginData>();
export let hide_shortcut_tooltips = writable<boolean>(false);

export const glossary = {
	dicts: {},
	replacements: {},
	source_language: "",
	target_language: "",
	text: ["", ""],
}

// I despise this, but due to the interconnected nature of the plugin, I really don't a better solution
export const globals = {
	plugin: null as TranslatorPlugin,
}
