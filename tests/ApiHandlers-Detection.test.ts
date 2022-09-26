import {empty_settings, filled_settings, input_desc, services} from "./services";
import type {APIServiceProviders, APIServiceSettings} from "../src/types";

test('Load correct-data.json (required for test)', () => {
	expect(filled_settings).not.toBe(undefined);
});

if (filled_settings) {
	for (const [id, config] of Object.entries(services)) {
		const service_settings = filled_settings?.service_settings[id as keyof APIServiceProviders] as APIServiceSettings;
		const translator = new config.service(service_settings);

		describe(config.name, () => {
			test('Service settings loaded', () => {
				expect(service_settings).not.toBe(undefined);
			});

			// Do not continue to test when no valid input configuration is available / some required value was not provided
			// Assumes that the config given is valid!
			const valid_config = (service_settings && (!config.inputs || config.inputs.every(input => service_settings[input as keyof APIServiceSettings])))
			test('validate (correct config)', () => {
				expect(valid_config).toBe(true);
			});

			if (!valid_config)
				return;

			for (const setting of Object.values(input_desc)) {
				// @ts-ignore
				translator[setting] = service_settings[setting as keyof APIServiceSettings];
			}

			describe("detect", () => {
				test("detect (Hello [en])", async () => {
					let result = await translator.detect("Hello");
					expect(result.detected_languages[0].language).toBe("en");
				});
			});
		});
	}
}
