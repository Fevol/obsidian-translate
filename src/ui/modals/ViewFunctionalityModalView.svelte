<script>
  import { Toggle, Dropdown, SettingItem } from "../components";

  import { settings } from "stores";
  import { createEventDispatcher } from "svelte";

  import { SERVICES_INFO } from "../../constants";
  import { available_translator_services } from "../../stores";

  const dispatch = createEventDispatcher();

  export let translation_service = "";
  export let auto_translate = false;
  export let apply_glossary = false;
  export let filter_mode = 0;
</script>

<SettingItem
  name="Translation Service"
  description="Set the service used for <i>this</i> view"
  type="dropdown"
>
  <Dropdown
    slot="control"
    options={$available_translator_services
      //.filter(service => SERVICES_INFO[service].type === 'translation')
      .map((service) => {
        return { value: service, text: SERVICES_INFO[service].display_name };
      })}
    value={translation_service}
    onChange={(value) => {
      translation_service = value;
    }}
  />
</SettingItem>

<SettingItem
  name="Automatic translate"
  description="Translate text as it is being typed"
  type="toggle"
  notices={[
    ...($settings.service_settings[translation_service]?.auto_translate
      ? []
      : [
          {
            text: `The 'automatic translation' setting for ${SERVICES_INFO[translation_service].display_name} is not activated, enable it via the service's settings tab`,
            type: "warning",
          },
        ]),
    {
      text: "The delay for the automatic translation can be set in the global translation service settings",
      type: "info",
    },
  ]}
>
  <Toggle
    slot="control"
    value={auto_translate}
    disabled={!auto_translate &&
      !$settings.service_settings[translation_service]?.auto_translate}
    onChange={(value) => {
      auto_translate = value;
    }}
  />
</SettingItem>

<SettingItem
  name="Apply glossary"
  description="Replace words with their glossary translation"
  type="toggle"
  notices={$settings.apply_glossary
    ? []
    : [
        {
          text: "Global 'glossary' option has not been activated yet, you can enable it in the 'Functionality' settings tab",
          type: "warning",
        },
      ]}
>
  <Toggle
    slot="control"
    disabled={!$settings.apply_glossary}
    value={apply_glossary}
    onChange={(value) => {
      apply_glossary = value;
    }}
  />
</SettingItem>

<SettingItem
  name="Filter mode"
  description="Set which languages are visible for this view"
  type="dropdown"
  notices={[
    {
      text: "Manual language selection can be set in the service's settings",
      type: "info",
    },
  ]}
>
  <Dropdown
    slot="control"
    options={[
      { value: 0, text: "All languages" },
      { value: 1, text: "Spellchecker languages" },
      { value: 2, text: "Manually selected languages" },
    ]}
    value={filter_mode}
    onChange={(value) => {
      filter_mode = parseInt(value);
    }}
  />
</SettingItem>

<div class="translator-confirmation-buttons">
  <button on:click={async () => dispatch("close")}> Cancel </button>

  <button
    class="svelcomlib-success"
    on:click={async () => {
      dispatch("close", {
        translation_service,
        auto_translate,
        apply_glossary,
        filter_mode,
      });
    }}
  >
    Confirm
  </button>
</div>
