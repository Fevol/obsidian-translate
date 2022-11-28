This README is written for adventurous users, developers and plugin reviewers, as an 
introductory guide to this hell of a mess that my code is. If you are instead looking for a
guide on how to use this plugin, please refer to the [tutorial](https://github.com/Fevol/obsidian-translate/blob/master/docs/TUTORIAL.md).

## Code structure
Below you can find a brief description of the general code structure, files/folders indicated by
`(!)` are the most significant code-wise, and will be described in more detail in the following sections.
```bash
/src/
├── README.md		You are here!
├── assets		SCSS file containing all of the plugins styles + classes
├── constants.ts	Has all constant values used by the plugin
├── handlers (!)	API wrappers of all translation services
├── helpers.ts		Helper functions used throughout the plugin
├── l10n		Localisation files
├── main.ts (!)		Main plugin file	
├── obsidian-util.ts	Obsidian-specific utility functions 
├── settings.ts		Settings page constructor
├── stores.ts (!)	Global stores that are used throughout the plugin
├── types.ts		All types of the plugin
├── typings		
│   └── obsidian-ex.d.ts 	Mock typings of undocumented Obsidian functions
├── ui
│   ├── animations	Svelte animations
│   ├── components	Basic components (buttons, inputs, etc.)
│   ├── modals		Modals used by the plugin
│   ├── obsidian-components	Obsidian-specific components (SettingItem, ...)
│   └── translator-components 	Main plugin components
│       ├── Reactivity.svelte (!)	Handles all reactive actions	
│       ├── SettingsPage.svelte		Settings page + navbar component
│       ├── ViewPage.svelte (!)		Translator View component
│       └── settings-tabs (!)	 	Setting tabs components	
├── util.ts		General utility functions
└── view.ts		View constructor
```

## Important plugin files

### /handlers/
Path: `src/handlers`<br>
This folder contains API wrappers for all translation services. The services are set up in a hierarchical structure,
with `src/handlers/dummy-translate.ts` being the base class. For more information on the handlers API, go to [here](https://github.com/Fevol/obsidian-translate/tree/master/src/handlers/README.md).

### main.ts
Path: `src/main.ts`<br>
This is the main plugin file, where the plugin is initialized and all the plugin functionality is set up.
You can find all the interactions with the Obsidian interface here, including executing commands, opening a
context menu on a note or files, and so on.

### stores.ts
Path: `src/stores.ts`<br>
This file contains all the global stores used by the plugin, some of which are reactive Svelte writables,
others simple objects. The currently used stores are:
- `settings`: Persistent plugin settings, changes made to this store are automatically saved to the `data.json`
- `data`: Non-persistent plugin data, contains data that is used throughout the plugin,such as:
  - `all_languages`: Key-value object of language locales to their display names (e.g. `en: English`)
  - `available_languages`: The languages available for the **global translator**, changes based on filters set
  - `available_services`: Services that the user can access, depends on platform and user-set settings
  - `spellcheck_languages`: Obsidian's set spellchecker languages, used as a filter on all langauges
- `glossary`
  - `dicts`: Dictionary of language pairs to their respective glossaries
  - `replacements`: Glossary regex matching rules per language pair, case (in)sensitive based on settings

### Reactivity.svelte
Path: `src/ui/translator-components/Reactivity.svelte`<br>
This Svelte file is constructed on mount of the plugin, and will process all changes in settings, data, ...
such that all TranslatorViews etc. are all in sync. Also handles loading and unloading of translation services, the services
are managed and shared from `active_services`.

### ViewPage.svelte
Path: `src/ui/translator-components/ViewPage.svelte`<br>
Implements the Translator View, every view has its own internal state, and makes use of a shared translator
object. Essentially a convenient-to-use front-end for the translator object.

### /settings-tabs/
Path: `src/ui/translator-components/settings-tabs/`<br>
Contains all the individual settings pages: `SettingsPage.svelte` contains a navbar, and
based on the tab selected in the navbar, the corresponding Settings Tab will be rendered.

Tab components:
- `AppearanceSettings.svelte`: Changing (default) appearance of plugin components
- `DetectorSettings.svelte`: Options for the `FastText` service, implements functionality for downloading and updating the service
- `FunctionalitySettings.svelte`: Change default behaviour of the plugin
- `GeneralSettings.svelte`: Changes the _global_ translation service and its functionality, plus some security settings
- `GlossarySettings.svelte`: Interface for manipulating the `glossary` object and adding/removing entries, plus updating a service's online glossary
- `HotkeySettings.svelte`: Change hotkeys for plugin actions, will automatically update 
- `TranslatorSettings.svelte`: Default settings page shared for all translation services, acts as an interface for changing the
   service's authentication data, functionality and interacts with translator's `validate()` and `languages()` methods


