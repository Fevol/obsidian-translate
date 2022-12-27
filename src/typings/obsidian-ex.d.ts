// Thanks to AquaCat/pjkaufman for the suggestion to add typings
import {App, Command, Vault} from 'obsidian';

declare global {
	interface Window {
		app: App;
	}
}


interface AppVaultConfig {
	accentColor: "" | string;
	alwaysUpdateLinks?: false | boolean;
	attachmentFolderPath?: "/" | string;
	autoConvertHtml?: true | boolean;
	autoPairBrackets?: true | boolean;
	autoPairMarkdown?: true | boolean;
	baseFontSize?: 16 | number;
	baseFontSizeAction?: true | boolean;
	communityPluginSortOrder: "download" | "update" | "release" | "alphabetical";
	communityThemeSortOrder: "download" | "update" | "release" | "alphabetical";
	// Name/ID of community theme being used, "" is default theme
	cssTheme?: "" | string;
	defaultViewMode?: "source" | "preview";
	emacsyKeys?: true | boolean;
	enabledCssSnippets?: string[];
	fileSortOrder?: "alphabetical";
	foldHeading?: true | boolean;
	foldIndent?: true | boolean;
	hotkeys?: {[key: string]: string};
	interfaceFontFamily?: "" | string;
	legacyEditor?: false | boolean;
	livePreview?: true | boolean;
	mobilePullAction?: "command-palette:open" | string;
	mobileToolbarCommands?: string[];
	monospaceFontFamily?: "" | string;
	nativeMenus?: null | boolean;
	newFileFolderPath?: "/" | string;
	newFileLocation?: "root" | "current";
	pdfExportSettings?: {
		pageSize: "letter" | string;
		landscape: false | boolean;
		margin: "0" | string;
		downscalePercent: 100 | number;
	};
	newLinkFormat?: "shortest" | "relative" | "absolute";
	promptDelete?: true | boolean;
	readableLineLength?: true | boolean;
	rightToLeft?: false | boolean;
	showFrontmatter?: false | boolean;
	showIndentGuide?: true | boolean;
	showInlineTitle?: true | boolean;
	showLineNumber?: false | boolean;
	showUnsupportedFiles?: false | boolean;
	showViewHeader?: false | boolean;
	smartIndentList?: true | boolean;
	spellcheck?: false | boolean;
	spellcheckDictionary?: [] | string[];
	spellcheckLanguages?: null | string[];
	strictLineBreaks?: false | boolean;
	tabSize?: 4 | number;
	textFontFamily?: "" | string;
	// "moonstone" is light theme, "obsidian" is dark theme
	theme?: "moonstone" | "obsidian";
	translucency?: false | boolean;
	trashOption?: "system" | "local" | "none";
	useMarkdownLinks?: false | boolean;
	useTab?: true | boolean;
	userIgnoreFilters?: null | string[];
	vimMode?: false | boolean;
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