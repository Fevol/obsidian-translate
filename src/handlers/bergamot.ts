import type TranslatorPlugin from "../main";
import type { BergamotRegistry, LanguageModelData, ModelFileData } from "../types";
import { DummyTranslate } from "./dummy-translate";
import type {
	DetectionResult,
	LanguagesFetchResult,
	ServiceOptions,
	TranslationResult,
	ValidationResult,
} from "./types";

import { Bergamot } from "./bergamot/bergamot";

import { requestUrl } from "obsidian";
import { BERGAMOT_REPOSITORY } from "../constants";
import t from "../l10n";

export class BergamotTranslate extends DummyTranslate {
	translator: Bergamot | undefined;
	detector: DummyTranslate | null = null;
	plugin: TranslatorPlugin;
	available_languages = ["en"];
	id = "bergamot";

	update_data(available_models: ModelFileData) {
		if (available_models) {
			this.available_languages = ["en"].concat(available_models.models!.map((x) => x.locale!));
			if (this.translator)
				this.translator.available_models = available_models;
		}
	}

	setup_service(available_models: ModelFileData) {
		if (!this.translator) {
			if (available_models.binary) {
				try {
					this.translator = new Bergamot(available_models);
					this.translator.loadTranslationEngine();
					this.available_languages = ["en"].concat(available_models.models!.map((x) => x.locale!));
					this.valid = true;
				} catch (error: unknown) {
					const message = error instanceof Error ? error.message : error as string;
					this.plugin.message_queue(`Error while loading Bergamot: ${message}`);
					this.translator = undefined;
					this.valid = false;
				}
			} else {
				this.plugin.message_queue("Bergamot binary is not installed");
				this.translator = undefined;
				this.valid = false;
			}
		} else {
			this.valid = true;
			this.available_languages = ["en"].concat(available_models.models!.map((x) => x.locale!));
		}
	}

	constructor(detector: DummyTranslate | null = null, plugin: TranslatorPlugin, available_models: ModelFileData) {
		super();
		this.plugin = plugin;
		this.detector = detector;
		this.valid = false;
		this.setup_service(available_models);
	}

	async service_validate(): Promise<ValidationResult> {
		if (this.translator !== undefined)
			return { valid: true, status_code: 200 };
		else
			return { valid: false, status_code: 400, message: "Bergamot service setup failed" };
	}

	async service_detect(text: string): Promise<DetectionResult> {
		if (!this.detector)
			return { status_code: 400, message: "Automatic language detection is not supported" };
		return this.detector.detect(text);
	}

	async service_translate(
		text: string,
		from: string,
		to: string,
		options: ServiceOptions = {},
	): Promise<TranslationResult> {
		let detected_language: string | undefined = "";
		if (from === "auto") {
			if (this.has_autodetect_capability()) {
				detected_language = (await this.detector!.detect(text)).detected_languages!.first()?.language;
				if (detected_language && detected_language !== "auto")
					from = detected_language;
				else
					return { status_code: 400, message: "Could not detect language" };
			} else {
				return { status_code: 400, message: "Automatic language detection is not supported" };
			}
		}

		if (from === to)
			return { status_code: 200, translation: text, detected_language: from };

		if (!this.available_languages.includes(from))
			return { status_code: 400, message: `${t(from)} is not installed as a language model` };
		if (!this.available_languages.includes(to))
			return { status_code: 400, message: `${t(to)} is not installed as a language model` };

		return {
			status_code: 200,
			translation: await this.translator!.translate(text, from, to),
			detected_language: detected_language,
		};
	}

	async service_languages(): Promise<LanguagesFetchResult> {
		const response = await requestUrl({ url: `${BERGAMOT_REPOSITORY}/registry.json` });
		const registry = response.json as BergamotRegistry;
		// https://raw.githubusercontent.com/mozilla/firefox-translations-models/main/registry.json
		const all_language_pairs = Object.keys(registry);

		// TODO: Check if Bergamot will add bidirectional translation for all languages
		//  If not, support one-directional translation (will require additional checks)
		// Only support languages that support translation in both directions
		const available_languages = all_language_pairs
			.filter(x => x.startsWith("en"))
			.map(x => x.substring(2))
			.filter(x => all_language_pairs.includes(`${x}en`));

		const mapped_languages: LanguageModelData[] = available_languages.map(x => {
			const duplicate_files = Object.values(registry[`${x}en` as keyof typeof registry])
				.map(y => y.name)
				.concat(Object.values(registry[`en${x}` as keyof typeof registry]).map((x: any) => x.name))
				.filter((lang, i, other) => other.indexOf(lang) !== i);

			const models_from = Object.values(registry[`${x}en` as keyof typeof registry]).map(x => {
				return {
					name: x.name,
					size: x.size as number,
					usage: duplicate_files.includes(x.name) ? "both" : "from",
				};
			});
			const models_to = Object.values(registry[`en${x}` as keyof typeof registry])
				.filter(x => !duplicate_files.includes(x.name))
				.map(x => {
					return {
						name: x.name,
						size: x.size as number,
						usage: duplicate_files.includes(x.name) ? "both" : "to",
					};
				});

			const files = models_from.concat(models_to);

			return {
				size: files.reduce((acc, x) => acc + x.size, 0),
				locale: x,
				files: models_from.concat(models_to),
				dev_from: registry[`${x}en` as keyof typeof registry].model.modelType === "dev",
				dev_to: registry[`en${x}` as keyof typeof registry].model.modelType === "dev",
			};
		});

		return { status_code: 200, languages: mapped_languages };
	}

	has_autodetect_capability(): boolean {
		return this.detector != null && this.detector.valid;
	}
}
