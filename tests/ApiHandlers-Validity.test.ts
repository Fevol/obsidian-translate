import type { APIServiceProviders, APIServiceSettings } from "../src/types";
import { empty_settings, filled_settings, input_desc, services } from "./services";

test("Load correct-data.json", () => {
	expect(filled_settings).not.toBe(undefined);
});

for (const [id, config] of Object.entries(services)) {
	const service_settings = filled_settings?.service_settings[id as keyof APIServiceProviders] as APIServiceSettings;
	const current_settings = empty_settings;

	describe(config.name, () => {
		test("Service settings loaded", () => {
			expect(service_settings).not.toBe(undefined);
		});

		describe("validate", () => {
			if (config.inputs) {
				for (const input of config?.inputs) {
					test(`validate (${input} unset)`, async () => {
						// @ts-expect-error (Generic settings object is compatible with class constructor)
						const translator = new (config.service)(current_settings);
						const result = await translator.validate();
						expect(result.status_code).not.toBe(200);
						expect(result.valid).toBe(false);
						expect(result.message).toBe(
							`Validation failed:\n\t${input_desc[input as keyof typeof input_desc]} was not specified`,
						);

						// @ts-expect-error (Assigning to settings)
						current_settings[input] = "wrong-value";
					});
				}

				test("validate (wrong values)", async () => {
					// @ts-expect-error (Generic settings object is compatible with class constructor
					const translator = new (config.service)(current_settings);
					const result = await translator.validate();
					expect(result.status_code).not.toBe(200);
					expect(result.valid).toBe(false);
					expect(result.message).toContain("Validation failed:\n");
				});

				if (service_settings) {
					test("validate (correct values)", async () => {
						// @ts-expect-error (Specified settings object is compatible with class constructor)
						const translator = new (config.service)(service_settings);
						const result = await translator.validate();
						expect(result.status_code).toBe(200);
						expect(result.valid).toBe(true);
					});
				}
			}
		});
	});
}
