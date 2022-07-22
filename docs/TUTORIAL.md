# Tutorial

## The Basics

### Setup

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/settings-validate.gif" width="800">

To start using the plugin:

1. Install the plugin by manually downloading one of the releases from Github, or by using
   [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Enable the plugin in the 'Community Plugins' tab
3. Open the Translate plugin settings
4. Select the **Translation Service** you want to use
5. Enter valid authentication details for the service (API key, Host, etc.)
6. Validate the settings by pressing the **Test** button
7. The translation service is now configered and ready to use

### Translate

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/translate.gif" width="800">

1. Open the Translation View by pressing the **Translate** button in the left ribbon or by executing the **Open
   Translation View** command
2. Select the language you want to translate from and to
3. Type/paste the text you want to translate

If you want to translate the text automatically, you can enable the **Auto Translate** option in the settings or in the
quick access commands in the translation view.

## Commands

### Change Translation Service

You can quickly switch between translation services by executing the **Change Translation Service** command or by
pressing its button in the translation view's quick access commands.

### Translate File

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/translate-files.gif" width="800">

You can translate a file by executing the **Translate File** command, there are two options for this command:
translate and replace the text in the current file _**or**_ translate current file and save it as a new file; the title
will also be translated, whenever possible

### Translate Selection
<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/context-menus.gif" width="800">


The **Translate Selection** command will translate the selected text in the current file.
It is also possible to right-click the selection and select a language to translate to from the dropdown menu.



## User Interface

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/view-layouts.gif" width="800">

You can set the layout for the translation view in the quick access commands, there are four modes available:
- **Automatic:** Layout is automatically determined based on the container size
- **Vertical:** Text areas and buttons are vertically aligned
- **Mixed**: Text areas and buttons are vertically aligned, but the text area is split into two columns
- **Horizontal:** Text areas and buttons are horizontally aligned

## Translation Services
### Bergamot
#### Description
[Bergamot](https://browser.mt) is an open-source translation engine developed by the Bergamot Project Consortium, 
consisting of Mozilla (Firefox), and the universities of Edinburgh, Sheffield, Tartu and Charles University in Prague; with funding by the EU.

The translation happens completely locally using machine learning models, which also enables you to use the service when
not connected to the internet. All text you translate will only be processed on your computer, and will not be sent to
third-party servers (as opposed to Google Translate, Bing, ...).

If you're wondering how the quality of the translations compare to more well-known translation services,
such as Google Translate and Bing, you can find empirical data [here](https://github.com/mozilla/firefox-translations-models/blob/main/evaluation/prod/results.md).

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
