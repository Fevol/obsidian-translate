import {DummyTranslate} from "./dummy-translate";
import type {
	DetectionResult,
	ValidationResult,
} from "./types";
import type {ModelFileData} from "../types";
import {FastText, FastTextModel} from "./fasttext/fasttext";
import {Notice} from "obsidian";

export class FastTextDetector extends DummyTranslate {
	detector: FastTextModel | undefined;
	id = "fasttext";

	version: number = 0;

	status: string = '';
	data: any = null;

	default: boolean = false;

	setup_service(available_models: ModelFileData) {
		if (available_models?.binary) {
			FastText.create().then(ft => {
				// FIXME: For some reason, you cannot catch the abort of fasttext_wasm here, so this is done in the fasttext wrapper
				//  by returning the error
				try {
					if (ft instanceof WebAssembly.RuntimeError) {
						this.valid = false;
						new Notice(ft.message.match(/\(([^)]+)\)/)![0].slice(1, -1), 4000);
					} else {
						(ft as FastText).loadModel(Object.values(available_models.models!)[0].name!).then((model: FastTextModel) => {
							this.detector = model;
							this.validate().then((x) => {
								this.valid = x.valid;
							});
						});
					}
				} catch (e) {
					this.valid = false;
					this.detector = undefined;
					new Notice("Error loading model: " + e, 4000);
				}
			})
		} else {
			this.valid = false;
			// this.plugin.message_queue("FastText is not installed, automatic detection of language is disabled.");
		}
	}

	constructor(available_models: ModelFileData) {
		super();
		this.setup_service(available_models);
	}

	async service_validate(): Promise<ValidationResult> {
		if (this.has_autodetect_capability())
			return {valid: true, status_code: 200};
		else
			return {valid: false, status_code: 400, message: "FastText service setup failed."};
	}

	async service_detect(text: string): Promise<DetectionResult> {
		let predictions: any = this.detector!.predict(text, 5, 0.0);
		let results = [];

		for (let i = 0; i < predictions.size(); i++)
			results.push({language: predictions.get(i)[1].replace("__label__", ""), confidence: predictions.get(i)[0]});
		return { status_code: 200, detected_languages: results};
	}

	has_autodetect_capability(): boolean {
		return this.detector !== undefined;
	}
}
