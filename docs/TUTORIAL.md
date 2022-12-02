# Tutorial

## The Basics

### Setup

<img src="images/validate-service.gif" width="800">

To start using the plugin:

1. Install the plugin by manually downloading one of the releases from GitHub, or by using
   [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Enable the plugin in the 'Community Plugins' tab
3. Open the Translate plugin settings
4. Select the **Translation Service** you want to use
5. Enter valid authentication details for the service (API key, Host, etc.)
6. Validate the settings by pressing the `Test` button
7. The translation service is now configered and ready to use

### Translate

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/auto-translate.gif" width="800">

1. Open the Translation View by pressing the `Translate` button in the left ribbon or by executing the `Open
   Translation View` command
2. Select the language you want to translate from and to
3. Type/paste the text you want to translate

If you want to translate the text automatically, you can enable the `Auto Translate` option in the settings or in the
quick access commands in the translation view.

## Commands

### Change Translation Service

You can quickly switch between translation services by executing the `Change Translation Service` command or by
pressing its button in the translation view's quick access commands.

### Translate File

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/file-translate.gif" width="800">

You can translate a file by executing the `Translate File` command, there are two options for this command:
translate and replace the text in the current file _**or**_ translate current file and save it as a new file; the title
will also be translated, whenever possible

### Translate Selection

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/context-menus.gif" width="800">


The `Translate Selection` command will translate the selected text in the current file.
You can also **right-click the selection**. On hovering the `Translate` button in the context menu, you can see a list
of languages you can translate to. On clicking one of them, the selected text will be translated to that language.
You can also translate immediately to your `default target language` by just clicking the `Translate` button.


## User Interface (Translation View)

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/appearance-settings.gif" width="800">

Each of the settings mentioned below can be changed in the `Appearance Setttings` modal, found in the top-right corner
of the translation view (! `Show tab title bar` must be activated first in `Settings > Appearance`.

All settings have a default value, but this too can be changed: to change them, open the `Appearance` tab in the plugin's settings.

### Layout
There are four modes different layout modes available:
- **Automatic:** Layout is automatically determined based on the container size
- **Vertical:** Text areas and buttons are vertically aligned
- **Mixed**: Text areas and buttons are vertically aligned, but the text area is split into two columns
- **Horizontal:** Text areas and buttons are horizontally aligned


### Quick settings
You can change the functionality of the translation view by using the quick settings on the top of the view.
There are six different quick settings available:
- **Change Translation Service:** Change the translation service of the currently selected view, the global translation service
  (used for translating via context menu's, etc.) can only be changed in the plugin settings or via the `Change Translation Service` command
- **Auto Translate:** Enable/Disable automatic translation of text, needs to be enabled first in the service's settings
- **Layout Change:** Change the layout of the translation view
- **Open Settings:** Opens the settings for the plugin
- **Change Filter**: Filter the selection of languages available in the language selection dropdowns
- **Apply Glossary:** Apply the glossary to the text, global glossary settings must be enabled first in the `Functionality` settings

### Quick actions
In each of the text areas, there are quick access commands available. These apply only to the currently selected/hovered text area.
Currently, there are three different quick access commands available:
- **Copy:** Copy the text in the text area to the clipboard
- **Clear:** Clear the text in the text area
- **Paste:** Paste the text from the clipboard to the text area

### Hide/Show attribution
If you wish to hide the attribution of the translation service, you can do so by clicking the `Hide attribution` button in the
`Appearance Settings` modal.


## Translation Services
### Bergamot
#### Description
[Bergamot](https://browser.mt) is an open-source translation engine developed by the Bergamot Project Consortium, 
consisting of Mozilla (Firefox), and the universities of Edinburgh, Sheffield, Tartu and Charles University in Prague; with funding by the EU.

The translation happens completely locally using machine learning models, which also enables you to use the service when
not connected to the internet. All text you translate will only be processed on your computer, and will not be sent to
third-party servers (as opposed to Google Translate, Azure, ...).

If you're wondering how the quality of the translations compare to more well-known translation services,
such as Google Translate and Azure, you can find empirical data [here](https://github.com/mozilla/firefox-translations-models/blob/main/evaluation/prod/results.md).

#### Installation

To use the Bergamot service, you need to install the Bergamot binary, this is the 'engine' that will be used to translate the text.
Afterwards, you can install any language model you wish to use. The model is a highly compressed, pre-trained neural network
that is fed to the translation engine, and will allow you to translate from English to the language you've chosen, and vice-versa.

The base size of Bergamot is 5.05MB, and each additional language model takes up about 40MB (the largest model is 70MB in size).

If you wish to have the ability to detect the language of the text you want to translate, also install the FastText binary,
as Bergamot does not include language detection functionality.

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/bergamot.gif" width="800">

### FastText
#### Description
[FastText](https://fasttext.cc/) is an open-source library for text classification (language detection) developed by 
Facebook (now Meta). Due to the models used being very compressed, the size of the entire package is very small -- its full size is only 1.72MB.


## Translating
### Glossary
<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/glossary.gif" width="800">

You can create a glossary to translate specific terminology for every language pair. To start, you need to enable the
`Apply glossary` option in the `Functionality` settings. It is advised to also enable the `Apply local glossary` option,
as currently, only a few translation services support glossaries.

If you also want to apply the glossary when you're using the `Detect Language` setting, you'll need to install
`FastText`, as the glossary requires the source language to be known ahead of time. The installation procedure can be
found in the previous section.

Now that the glossary is fully enabled, you can start adding entries to it. Open the `Glossary` tab in the plugin's settings,
and add your entry in the bottom-most row, press `Enter` or the `Add` button to finally append the entry to the glossary.

Some important things to note:
- You can enable case-insensitive matching by enabling the `Case insensitive glossary` option in the `Functionality` settings
- The glossary table can be sorted by clicking on the column headers, and filtered with the `Filter` input field
- The `Add & Update terms in both directions` option will add a glossary entry for both language pairs (e.g. `en -> nl` and `nl -> en`)
- Glossaries are stored within the `glossary.json` file, and can be edited manually if you wish to do so


#### Glossary Syncing
It is possible to sync your glossary with your translation services, which can offer improved translation quality for your terminology.
However, it is currently only available for `DeepL`.

Be aware that every time you press the `Sync` button, _all_ language pairs that can be added to the service's glossary, will
be sent over, and created, individually. As it requires a lot of API calls, it is advised to only use this feature when you're
sure you've finished adding all your glossary entries.
