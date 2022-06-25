import {FastText, addOnPostRun} from "./languageDetection/fasttext";
import type TranslatorPlugin from "../main";

function getPredictions(predictions: any) {
	let results = [];
	for (let i=0; i<predictions.size(); i++)
		results.push({locale: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
	return results;
}


export function importFastText(plugin: TranslatorPlugin) {
	// fetch("./languageDetection/fasttext_wasm.wasm").then(response =>
	// 	response.arrayBuffer()
	// ).then(bytes => {
	// 	let mod = new WebAssembly.Module(bytes);
	// 	WebAssembly.instantiate(mod, {}).then(instance => {
	// 		let exports = instance.exports;
	// 	});
	// })

	addOnPostRun(async () => {
		let ft = new FastText(plugin);

		const url = "lid.176.ftz";
		let model = await ft.loadModel(url)

		console.log("Model loaded.")

		let text = "Bonjour à tous. Ceci est du français";
		console.log(text);
		console.log(getPredictions(model.predict(text, 5, 0.0)));

		text = "Hello, world. This is english";
		console.log(text);
		console.log(getPredictions(model.predict(text, 5, 0.0)));

		text = "Merhaba dünya. Bu da türkçe"
		console.log(text);
		console.log(getPredictions(model.predict(text, 5, 0.0)));
	});
}


