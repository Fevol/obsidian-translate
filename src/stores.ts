import {writable, type Writable} from "svelte/store";
import type {TranslatorPluginSettings, PluginData} from "./types";

export const settings = writable<TranslatorPluginSettings>();
export const data = writable<PluginData>();
export let hide_shortcut_tooltips = writable<boolean>(false);
