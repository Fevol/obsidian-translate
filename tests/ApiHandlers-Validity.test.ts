import {services, empty_settings, input_desc, filled_settings} from "./services";
import type {APIServiceProviders, APIServiceSettings, TranslatorPluginSettings} from "../src/types";


test('Load correct-data.json', () => {
	expect(filled_settings).not.toBe(undefined);
});

for (const [id, config] of Object.entries(services)) {
	const translator = new config.service(empty_settings);
	const service_settings = filled_settings?.service_settings[id as keyof APIServiceProviders] as APIServiceSettings;

	describe(config.name, () => {
		test('Service settings loaded', () => {
			expect(service_settings).not.toBe(undefined);
		});

		describe("validate", () => {
			// @ts-ignore
			if (config.inputs) {
				// @ts-ignore
				for (const input of config?.inputs) {
					//@ts-ignore
					test(`validate (${input} unset)`, async () => {
						const result = await translator.validate();
						expect(result.valid).toBe(false);
						//@ts-ignore
						expect(result.message).toBe(input_desc[input] + " was not specified");

						//@ts-ignore
						translator[input] = "wrong-value";
					});
				}

				test("validate (wrong values)", async () => {
					const result = await translator.validate();
					expect(result.valid).toBe(false);
					expect(result.message).toContain("Validation failed:\n");
				});

				if (service_settings) {
					for (const setting of Object.values(input_desc)) {
						// @ts-ignore
						translator[setting] = service_settings[setting as keyof APIServiceSettings];
					}
					test("validate (correct values)", async () => {
						const result = await translator.validate();
						expect(result.valid).toBe(true);
					});
				}
			}
		});
	});
}
