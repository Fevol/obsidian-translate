export async function writeOrReplace(path: string, data: ArrayBuffer) {
	// getAbstractFileByPath will not find the file if it is inside a hidden folder (e.g. obsidian);
	// it seems like createBinary does not care about hidden folders
	if (await app.vault.adapter.exists(path))
		await app.vault.adapter.writeBinary(path, data);
	else
		await app.vault.createBinary(path, data);
}

export async function writeRecursive(path: string, data: any) {
	let paths = path.split('/').filter(x => x !== '');
	let current_path = '';
	for (let i = 0; i < paths.length - 1; i++) {
		current_path += paths[i];
		if (!await app.vault.adapter.exists(current_path))
			await app.vault.adapter.mkdir(current_path);
		current_path += '/';
	}
	await app.vault.adapter.writeBinary(path, data);
}

