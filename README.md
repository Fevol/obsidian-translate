# Obsidian Translate

A plugin for [Obsidian](https://obsidian.md/) that adds multiple ways to translate text, with the translation service
of your choice. ***This plugin is still in early beta!***

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/obsidian-translate.gif" width="800">

## Usage

Enable the plugin by manually downloading one of the releases from Github, or by
using [BRAT](https://github.com/TfTHacker/obsidian42-brat).

To start using the program, head over to the plugin's settings page and enter the authentication details for any of the
services you wish to use. Note that unless you host the service locally, you _will_ need to sign up for an API key.
***This plugin does not provide any API keys by default.***

**Make sure to validate settings by pressing the 'Test' button. The program will not 
allow you to translate text until you do!**

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/settings-validate.gif" width="800">

Afterwards, you can open the Translation View by either accessing the left ribbon, or by executing the 
'Open Translation View' command. For more informations, head over to the [documentation](https://github.com/Fevol/obsidian-translate/blob/master/docs/TUTORIAL.md).


## Translation Services
### Services overview

| Translation Service     | Supported | Free                                    | Offline Support | Preserves Formatting | Languages | Notes                      |
|-------------------------|-----------|-----------------------------------------|-----------------|----------------------|-----------|----------------------------|
| Google Translate        | ✅         | ✅ *(0.5M characters **per month**)* ¹ ² |                 | ✅                    | 109       |                            |
| Deepl                   | ✅         | ✅  *(0.5M characters **per month**)* ¹  |                 | ✅                    | 28        |                            |
| Yandex Translate        | ❓         | ✅ *(5M characters)* ¹                   |                 | ❓                    | 93        |                            |
| Libre Translate         | ✅         | ✅                                       | ✅               | ❌                    | 30        | Can be hosted locally      |
| Bing Translator (Azure) | ✅         | ✅  *(2M characters **per month**)* ¹    |                 | ✅                    | 111       |                            |
| Amazon Translate        | ⭕         | ✅  *(2M characters **per month**)* ¹ ³  |                 |                      |           |                            |
| Bergamot                | ⭕         | ✅                                       | ✅               |                      | 14        | Waiting for stable release |
| QQ                      | ⭕         |                                         |                 |                      |           |                            |
| Youdao                  | ⭕         |                                         |                 |                      |           |                            |


_¹ Requires a valid credit card to sign up for a free API key_<br>
_² Free 300$ credit when signing up (valid for three months)_<br>
_³ Free for a year after signing up_

| Symbol | Description                       |
|--------|-----------------------------------|
| ✅      | Fully tested, **_should_** work   |
| ❌      | Fully tested, **does _not_** work |
| ❓      | Implemented, needs to be tested   |
| ⭕      | Plans to implement                |

### Notes

- Most services require an _active_ internet connection to work. If you want to translate text offline, you could host [Libre Translate](https://libretranslate.com) 
on your computer/network on any operating system, using Docker or Flask.
- Most services require a valid credit card to sign up for a free API key. Furthermore, the credit card will get charged if you go beyond the free character limit.
- Not every translation service respects the formatting of the source text. It may be possible that this gets lost in
  the translation process. Reference the table above to see if your service supports preserving formatting.
  More complex formatting will have a higher likelihood of breaking when being translated.
- Make sure that you _only_ enable automatic translation if you have a sufficiently high character cap on your API
  account, or  locally host your own translation service (e.g. with Libre Translate).

## Features
### Commands
- **Translate current file:** Translate _current_ file
- **Translate to new file:** Translate active document to new file, title of document also gets translated
- **Translate selection:** Translate current selection in the editor
- **Detect selection:** Detect language of current selection in the editor
- **Change provider:** Change the the selected translation service provider
- **Open Translation View:** Open the custom translation view

### Editor
- Translation view
  - Manually/automatic translation
  - Quick access to most important settings (change providers, automatic translate, language filter, layout, plugin settings)
- Right mouse (context menu) contains dropdown to translate selection 

## Bugs
- No known bugs


## Future plans

- Adding more ways to determine when to automatically translate, such as:
    - Every `x` seconds
    - User has completed a sentence (entered period)
    - ... (suggest!)
- Improving reliability of the translation service handlers
- Make localization of language codes appear correctly regardless of the API used 
- Integration of more translation services
- Add proper localization support to the plugin
- Improve the settings layout and add animated transitions when switching between translation services (?)
- General UIX improvements
- Once all that is done, upload the plugin to the official repository
- ...

## Discussion and Feedback

Any feedback would *very* much be appreciated. Please use the [GitHub issue tracker]() to report bugs, request features,
or suggest improvements, or message me over on Discord (@Fevol#9470).

This was mainly a passion project to implement something I personally really needed, and I think that with this release,
I finally have worked all the basic functionality out. However, I do realise that there is so much more that *could* be
done with this; so, if you have _any_ ideas, I would love to hear them!
