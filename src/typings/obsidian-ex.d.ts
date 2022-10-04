// Thanks to AquaCat/pjkaufman for the suggestion to add typings
import {Leaf, Vault} from 'obsidian';


interface AppVaultConfig {
	accentColor?: string;
	alwaysUpdateLinks?: boolean;
	baseFontSize?: number;
	communityPluginSortOrder?: string;
	communityThemeSortOrder?: string;
	cssTheme?: string;
	enabledCssSnippets?: string[];
	interfaceFontFamily?: string;
	nativeMenus?: boolean;
	promptDelete?: boolean;
	showInlineTitle?: boolean;
	showViewHeader?: boolean;
	spellcheckLanguages?: string[];
	theme?: string;
	translucency?: boolean;
}

interface PluginManifest {
	author?: string;
	authorUrl?: string;
	description?: string;
	dir?: string;
	id?: string;
	isDesktopOnly?: boolean;
	minAppVersion?: string;
	name?: string;
	version?: string;
}


declare module 'obsidian' {
	interface App {
		appId?: string;
		plugins: {
			enabledPlugins: Set<string>;
			manifests: Map<string, PluginManifest>;
			plugins: Map<string, any>;
			updates: Map<string, string>;
			uninstallPlugin(...args): void;
		}

		loadLocalStorage(key: string): any;
		saveLocalStorage(key: string, value: any): void;
	}

	interface View {
		headerEl: HTMLElement;
	}

	interface WorkspaceLeaf {
		id?: string;

		tabHeaderEl: HTMLElement;
		tabHeaderInnerIconEl: HTMLElement;
		tabHeaderInnerTitleEl: HTMLElement;
	}

	interface Vault {
		on(name: 'config-changed', callback: () => void, ctx?: any): EventRef;
		config: AppVaultConfig;
	}
}
