import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult,
	ValidationResult,
	ModelFileData
} from "../types";
import {FastText, FastTextModel, addOnPostRun} from "./fasttext/fasttext";

export class FastTextDetector extends DummyTranslate {
	detector: FastTextModel;

	version: number;

	plugin: TranslatorPlugin;

	status: string = '';
	data: any = null;

	setup_service(available_models: ModelFileData) {
		if (available_models) {
			FastText.create(this.plugin).then(ft => {
				// FIXME: For some reason, you cannot catch the abort of fasttext_wasm here, so this is done in the fasttext wrapper
				//  by returning the error
				try {
					if (ft instanceof WebAssembly.RuntimeError)
						this.plugin.message_queue(ft.message.match(/\(([^)]+)\)/)[0].slice(1, -1));
					else {
						// @ts-ignore
						ft.loadModel(Object.values(available_models.models)[0].name).then((model: FastTextModel) => {
							this.detector = model;
							this.validate().then((x) => {
								this.valid = x.valid;
							});
						});
					}
				} catch (e) {
					this.valid = false;
					console.log("Error loading model: " + e);
				}
			})
		} else {
			this.plugin.message_queue("FastText is not installed, automatic detection of language is disabled.");
		}
	}

	constructor(plugin: TranslatorPlugin, available_models: ModelFileData) {
		super();
		this.plugin = plugin;
		this.setup_service(available_models);
	}

	async validate(): Promise<ValidationResult> {
		return {valid: this.has_autodetect_capability()};
	}

	async detect(text: string): Promise<Array<DetectionResult>> {
		if (!this.valid)
			return [{message: "Detection service is not validated"}];

		if (!text.trim())
			return [{message: "No text was provided"}];

		let predictions: any = this.detector.predict(text, 5, 0.0);
		let results = [];

		for (let i = 0; i < predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return results;
	}

	has_autodetect_capability(): boolean {
		return this.detector != null;
	}
}
