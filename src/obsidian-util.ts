import {apiVersion, Platform} from "obsidian";

/**
 * Helper function for overwriting a file if it exists, else saving it as a new file
 * @param path - Normalized path of the file
 * @param data - Binary data to write to the file
 * @private
 */
export async function writeOrReplace(path: string, data: ArrayBuffer) {
	// getAbstractFileByPath will not find the file if it is inside a hidden folder (e.g. obsidian);
	// it seems like createBinary does not care about hidden folders
	if (await app.vault.adapter.exists(path))
		await app.vault.adapter.writeBinary(path, data);
	else
		await app.vault.createBinary(path, data);
}

/**
 * Helper function for creating the directories of a file if they do not exist
 * @param path - Normalized path of the file
 * @param data - Binary data to write to the file
 * @private
 */
export async function writeRecursive(path: string, data: any) {
	await app.vault.adapter.mkdir(path.substring(0, path.lastIndexOf('/')));
	await app.vault.adapter.writeBinary(path, data);
}

/**
 * Helper function for opening the settings tab of the plugin
 *
 * @remark prevents the plugin tab to be opened again, despite already being open (otherwise, some nasty bugs can occur due to onMount logic of settings page being executed twice)
 */
export function openSettingTab() {
	app.setting.open();
	if (app.setting.lastTabId !== 'translate') {
		app.setting.openTabById("translate");
	}
}

/**
 * Helper function for getting debug information
 * @async
 * @returns \{platform: string, plugin_version: string, obsidian_version: string, framework_version: string}
 */
export async function getObsidianData() {
	let framework_version;
	if (Platform.isMobileApp) {
		// @ts-ignore (Capacitor exists)
		const capacitor_info = await Capacitor.nativePromise('App', 'getInfo');
		if (capacitor_info)
			framework_version = capacitor_info.version + " (" + capacitor_info.build + ")";
	} else {
		framework_version = navigator.userAgent.match(/obsidian\/([\d\.]+\d+)/)?.[1] || "unknown"
	}

	return {
		plugin_version: app.plugins.plugins['translate'].manifest.version,
		platform: Platform.isMobileApp ? (Platform.isAndroidApp ? 'Android' : Platform.isIosApp ? 'iOS' : 'mobile') :
			(Platform.isMacOS ? 'macOS' : 'Desktop'),
		framework_version,
		obsidian_version: apiVersion,
	}
}


/**
 * Helper function for generating a pre-filled bug report for GitHub
 * @async
 * @param title - Title of the bug report
 * @param data - Debug information
 * @returns {string} - URL to create a new issue on GitHub
 */
export async function generateGithubIssueLink(title: string, data: { [key: string]: any } = {}) {
	const title_string = title ? `[BUG] ${title} – ADD A TITLE HERE` : '[BUG] ADD A TITLE HERE';
	try {
		const base_data = await getObsidianData();
		const issue_data = {...base_data, ...data};
		const data_string = Object.entries(issue_data).map(([key, value]) => `**${key}**: ${JSON.stringify(value)}`).join('\n');

		return `https://github.com/Fevol/obsidian-translate/issues/new?` +
			new URLSearchParams({
				title: title_string,
				body: `# User report\n**Description:** ADD A SHORT DESCRIPTION HERE \n\n\n\n---\n# Debugger data (do not alter)\n${data_string}`,
				labels: `bug`
			});
	} catch (e) {
		return 'https://github.com/Fevol/obsidian-translate/issues/new?' +
			new URLSearchParams({
				title: title_string,
				body: `# User report\n**Description:** ADD A SHORT DESCRIPTION HERE \n\n\n\n---\n# Debugger data (do not alter)\n**Error while generating debugger data:** ${e}`,
				labels: `bug`
			});
	}
}


/**
 * Helper function to open GitHub issue link for user
 * @async
 * @param title - Title of the bug report
 * @param data - Debug information
 * @returns {Promise<void>}
 */
export async function openGithubIssueLink(title: string = '', data: { [key: string]: any } = {}) {
	window.open(await generateGithubIssueLink(title, data), '_blank');
}
