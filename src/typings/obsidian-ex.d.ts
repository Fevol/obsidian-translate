// Thanks to AquaCat/pjkaufman for the suggestion to add typings
import {App, Command, Vault} from 'obsidian';

declare global {
	interface Window {
		app: App;
	}
}


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
		account: {
			company: string;
			email: string;
			expiry: number;
			key: string;
			keyValidation: string;
			license: string;
			name: string;
			seats: number;
			token: string;
		};
		appId?: string;
		commands: {
			commands: Record<string, Command>;
			editorCommands: Record<string, Command>;
		};
		customCss: {
			enabledSnippets: Set<string>;
			oldThemes: string[];
			snippets: string[];
			theme: string;
			themes: Record<string, PluginManifest>
		};
		isMobile: boolean;
		plugins: {
			enabledPlugins: Set<string>;
			manifests: Map<string, PluginManifest>;
			plugins: Map<string, any>;
			updates: Map<string, string>;
			uninstallPlugin(...args): void;
		};
		setting: {
			activateTab: string;
			dimBackground: boolean;
			lastTabId: string;
			open: () => void;
			openTabById: (id: string) => void;
		};
		vault: Vault;
		workspace: Workspace;

		loadLocalStorage(key: string): any;
		saveLocalStorage(key: string, value: any): void;
	}

	interface View {
		headerEl: HTMLElement;
		titleEl: HTMLElement;
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
