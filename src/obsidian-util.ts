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
