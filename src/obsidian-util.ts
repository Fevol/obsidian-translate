import {aesGcmDecrypt, aesGcmEncrypt} from "./util";
import type {APIServiceSettings} from "./types";

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


export async function getAPIKey(service: string, mode: string, service_settings: any) {
	if (mode === 'password')
		return await aesGcmDecrypt(service_settings[service].api_key, localStorage.getItem('password'));
	else if (mode === 'local_only')
		return localStorage.getItem(`${service}_api_key`);
	else if (mode === 'dont_save')
		return sessionStorage.getItem(`${service}_api_key`);
	else
		return service_settings[service].api_key;
}

export async function setAPIKey(service: string, mode: string, key: string, service_settings: any) {
	if (mode === "password")
		service_settings[service].api_key = await aesGcmEncrypt(key, localStorage.getItem('password'));
	else if (mode === "local_only")
		localStorage.setItem(service + '_api_key', key);
	else if (mode === "dont_save")
		sessionStorage.setItem(service + '_api_key', key);
	else
		service_settings[service].api_key = key;
}
