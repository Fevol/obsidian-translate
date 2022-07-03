import type {DetectionResult} from "../types";
import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {ValidationResult} from "../types";
import {FastText, FastTextModel, addOnPostRun} from "./fasttext/fasttext";

export class BergamotTranslate extends DummyTranslate {
	model: FastTextModel;

	constructor(plugin: TranslatorPlugin) {
		super();

		FastText.create(plugin).then(ft => {
			// FIXME: For some reason, you cannot catch the abort of fasttext_wasm here, so this is done in the fasttext wrapper
			//  by returning the error
			try {
				if (ft instanceof WebAssembly.RuntimeError)
					plugin.message_queue(ft.message.match(/\(([^)]+)\)/)[0].slice(1, -1));
				else
					ft.loadModel("lid.176.ftz").then((model: FastTextModel) => { this.model = model; });
			} catch (e) {
				console.log("Error loading model: " + e);
			}

		})
	}

	async validate(): Promise<ValidationResult> {
		return {valid: this.model !== null};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Translation service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		return BergamotTranslate.getPredictions(this.model.predict(text, 5, 0.0));
	}


	private static getPredictions(predictions: any) {
		let results = [];
		for (let i=0; i<predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return results;
	}

}
