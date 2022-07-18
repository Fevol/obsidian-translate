import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult,
	ValidationResult,
} from "../types";
import {FastText, FastTextModel, addOnPostRun} from "./fasttext/fasttext";

export class FastTextDetector extends DummyTranslate {
	model: FastTextModel;

	version: number;

	plugin: TranslatorPlugin;

	status: string = '';
	data: any = null;

	constructor(plugin: TranslatorPlugin) {
		super();
		this.plugin = plugin;

		FastText.create(plugin).then(ft => {
			// FIXME: For some reason, you cannot catch the abort of fasttext_wasm here, so this is done in the fasttext wrapper
			//  by returning the error
			try {
				if (ft instanceof WebAssembly.RuntimeError)
					plugin.message_queue(ft.message.match(/\(([^)]+)\)/)[0].slice(1, -1));
				else {
					ft.loadModel("lid.176.ftz").then((model: FastTextModel) => {
						this.model = model;
						this.validate().then((x) => {
							this.valid = x.valid;
						});
					});
				}
			} catch (e) {
				console.log("Error loading model: " + e);
			}
		})
	}

	async validate(): Promise<ValidationResult> {
		return {valid: this.has_autodetect_capability()};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Detection service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		let predictions: any = this.model.predict(text, 5, 0.0);
		let results = [];

		for (let i = 0; i < predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return results;
	}

	has_autodetect_capability(): boolean {
		return this.model != null;
	}
}
