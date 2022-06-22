export function importFastText() {
	fetch("./languageDetection/fasttext_wasm.wasm").then(response =>
		response.arrayBuffer()
	).then(bytes => {
		let mod = new WebAssembly.Module(bytes);
		WebAssembly.instantiate(mod, {}).then(instance => {
			let exports = instance.exports;
		});
	})
}


