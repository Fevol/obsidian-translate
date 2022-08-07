# Obsidian Translate

A plugin for [Obsidian](https://obsidian.md/) that adds multiple ways to translate text, with the translation service
of your choice. ***This plugin is still in early beta!***

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/obsidian-translate.gif" width="800">

---

## Usage

Enable the plugin by manually downloading one of the releases from Github, or by
using [BRAT](https://github.com/TfTHacker/obsidian42-brat).

To start using the program, head over to the plugin's settings page and enter the authentication details for any of the
services you wish to use. Note that for most services, you _will_ need to sign up for an API key.
Reference the [table below](https://github.com/fevol/obsidian-translate#services-overview)
to see which services can be used without having to sign up.

***This plugin does not provide any API keys.*** 



**Make sure to validate settings by pressing the 'Test' button. The program will not 
allow you to translate text until you do!**

<img src="https://raw.githubusercontent.com/Fevol/obsidian-translate/master/images/settings-validate.gif" width="800">

Afterwards, you can open the Translation View by either accessing the left ribbon, or by executing the 
'Open Translation View' command. For more informations, head over to the [documentation](https://github.com/Fevol/obsidian-translate/blob/master/docs/TUTORIAL.md).

---

## Translation Services
### Services overview

| Translation Service     | Supported | Free                                  | Offline Support | Mobile Support | Preserves Formatting | Languages |
|-------------------------|-----------|---------------------------------------|-----------------|:---------------|----------------------|-----------|
| Google Translate        | ✅         | *(0.5M characters **per month**)* ¹ ² |                 |                | ✅                    | 109       |
| Deepl                   | ✅         | *(0.5M characters **per month**)* ¹   |                 |                | ✅                    | 28        |
| Yandex Translate        | ❓         | *(5M characters)* ¹                   |                 |                |                      | 93        |
| Libre Translate         | ✅         | ✅                                     | ✅               |                | ❌                    | 30        |
| Bing Translator (Azure) | ✅         | *(2M characters **per month**)* ¹     |                 |                | ✅                    | 111       |
| Amazon Translate        | ⭕         | *(2M characters **per month**)* ¹ ³   |                 |                |                      |           |
| Bergamot                | ✅         | ✅                                     | ✅               | ❌              | ✅                    | 14        |
| Fanyi QQ                | ❓         |                                       |                 |                |                      | 18        |
| Fanyi Youdao            | ❓         |                                       |                 |                |                      | 112       |
| Fanyi Baidu             | ❓         |                                       |                 |                |                      | 201       |
| Lingva Translate        | ✅         | ✅                                     |                 |                |                      | 109       |


_¹ Requires a valid credit card to sign up for a free API key_<br>
_² Free 300$ credit when signing up (valid for three months)_<br>
_³ Free for a year after signing up_

| Symbol | Description                         |
|--------|-------------------------------------|
| ✅      | Fully tested, **_should_** work     |
| ❌      | Fully tested, **does _not_** work   |
| ❓      | Implemented, **needs to be tested** |
| ⭕      | Plans to implement                  |

### Notes

- Most services require an _active_ internet connection to work. If you want to translate text offline, you can use
  [Bergamot](https://browser.mt) translation engine by installing the binary and its models, or host [Libre Translate](https://libretranslate.com) 
on your computer/network on any operating system with Docker or Flask.
- Some services require a valid credit card to sign up for a free API key. Furthermore, the credit card will get charged if you go beyond the free character limit,
make sure to keep your eyes on it!
- Not every translation service respects the formatting of the source text. It may be possible that this gets lost in
  the translation process. Reference the table above to see if your service supports preserving formatting.
  More complex formatting will have a higher likelihood of breaking when being translated.
- Make sure that you _only_ enable automatic translation if you have a sufficiently high character cap on your API
  account, or the translation service is locally hosted (e.g. Bergamot or Libre Translate).

---

## Features
For more informations, head over to the [documentation](https://github.com/Fevol/obsidian-translate/blob/master/docs/TUTORIAL.md).

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
  - Multiple views allowed
- Right mouse (context menu) contains dropdown to translate selection 

---

## Future plans
### Features
- More auto-translate options
- Localization support
- Glosary support
- Integration with Translation Memories
- Custom view for translation paragraph per paragraph
- Keep track of character limit

### Improvements
- General UIX improvements
- Improving reliability of the translation service handlers
- Reducing the amount of characters sent to the translation services
  - Caching translation results of sentence (continuous typing in translation view will not result in linear growth of amount of characters being sent over)
  - ...

Most up-to-date plans can be found [here](https://github.com/users/Fevol/projects/1)

---

## Security and privacy considerations
### Privacy
The plugin will only send requests to a translation service on user request. The only exception to this is when the user
has enabled automatic translation, which will send a translation request for text in the Translator View after a
certain amount of time has passed since the last keystroke of the user.

If you don't want to use cloud-hosted translation services, it's possible to host your own translation service locally,
using either Bergamot or Libre Translate. The text you translate will not leave your computer, and will work offline.

### Security
You can set how the API keys are stored on the device/plugin data, such that there is a smaller likelihood
  of them being read/stolen by a third party, below are some of the implemented storage methods:
  - **No security:** the API keys are stored as plaintext in `data.json`.
  - **Encrypted with password:** the API keys are stored as ciphertext in `data.json`, with the password
    being user-provided. The password only needs to be entered _once_ for each device.
  - **Only save locally:** the API keys are stored on your device's local storage, and will persist across
    app restarts. The API key will have to be entered _once_ for each device.
  - **Only keep for session:** the API keys are stored on your device's local storage, and will be cleared
    when Obsidian closes. The API key will have to be entered _once_ for each device.
---

## Discussion and Feedback

Any feedback would *very* much be appreciated. Please use the [GitHub issue tracker](https://github.com/Fevol/obsidian-translate/issues/new) to report bugs, request features,
or suggest improvements, or message me over on Discord (@Fevol#9470).

This was mainly a passion project to implement something I personally really wanted. I hope you enjoy the plugin!

Currently, I'm looking for feedback on the following topics:
- Integration of more translation service providers
- UX improvements (more shortcuts, commands, ...)
- UI improvements (additional layouts, tweaks, ...)
