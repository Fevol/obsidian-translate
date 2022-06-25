import type {DetectionResult} from "../types";
import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {ValidationResult} from "../types";
import {FastText, FastTextModel, addOnPostRun} from "./languageDetection/fasttext";

export class BergamotTranslate extends DummyTranslate {
	model: FastTextModel;

	constructor(valid: boolean, plugin: TranslatorPlugin) {
		super(valid);
		// TODO: Check if file scripts exist
		let ft = new FastText(plugin);
		ft.loadModel("lid.176.ftz").then((model) => { this.model = model; });
	}

	async validate(): Promise<ValidationResult> {
		return {valid: true};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		return BergamotTranslate.getPredictions(this.model.predict(text, 5, 0.0));
	}


	private static getPredictions(predictions: any) {
		let results = [];
		for (let i=0; i<predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return results;
	}

}
