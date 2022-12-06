import type TranslatorPlugin from "../main";
import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult,
	ValidationResult,
	ModelFileData
} from "../types";
import {FastText, FastTextModel} from "./fasttext/fasttext";

export class FastTextDetector extends DummyTranslate {
	detector: FastTextModel;
	id = "fasttext";

	version: number;

	plugin: TranslatorPlugin;

	status: string = '';
	data: any = null;

	default: boolean = false;

	setup_service(available_models: ModelFileData) {
		if (available_models?.binary) {
			FastText.create(this.plugin).then(ft => {
				// FIXME: For some reason, you cannot catch the abort of fasttext_wasm here, so this is done in the fasttext wrapper
				//  by returning the error
				try {
					if (ft instanceof WebAssembly.RuntimeError) {
						this.valid = false;
						this.plugin.message_queue(ft.message.match(/\(([^)]+)\)/)[0].slice(1, -1));
					} else {
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
			this.valid = false;
			// this.plugin.message_queue("FastText is not installed, automatic detection of language is disabled.");
		}
	}

	constructor(plugin: TranslatorPlugin, available_models: ModelFileData) {
		super();
		this.plugin = plugin;
		this.setup_service(available_models);
	}

	async service_validate(): Promise<ValidationResult> {
		return {valid: this.has_autodetect_capability()};
	}

	async service_detect(text: string): Promise<DetectionResult> {
		let predictions: any = this.detector.predict(text, 5, 0.0);
		let results = [];

		for (let i = 0; i < predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return { status_code: 200, detected_languages: results};
	}

	has_autodetect_capability(): boolean {
		return this.detector != null;
	}
}
