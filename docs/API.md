This README contains examples on how to access the plugin API, how you can make
translation requests, and more. This API is intended for both plugin developers,
as well as casual users that want to incorporate translations into their workflow.

Please open an issue if you have any suggestions or ideas on how to improve the API and its documentation.


## Set-up API
If the plugin is properly installed and enabled, you can access the translator API like this:
```ts
const api = app.plugins.plugins['translate']?.api
```
(Developer note: if your IDE gives an error on this line, you may have to `//@ts-ignore` it,
or add typings for `app.plugins.plugins`, see [here](https://github.com/Fevol/obsidian-translate/blob/ae0adc1abbb67fd99c5c9b427bea7b08a60c57f8/src/typings/obsidian-ex.d.ts#L113-L119))

Now that you have the [`TranslatorAPI`](https://github.com/Fevol/obsidian-translate/blob/master/src/api.ts) object, check whether it is actually available:
```ts
if (api) {
    // ... API is guaranteed to exist
}
```

In order to actually send requests, you should also check whether the service is available.
You can do this with:
```ts
if (api.canTranslate) {
	// Service is able to translate text
}
```

All in all, you should at least call this code before using any of the methods:
```ts
const api = app.plugins.plugins['translate']?.api
if (api?.canTranslate) {
	await api.translate('Hello world!', 'en', 'de')
}
```




## API methods
### Introduction
The retrieved `API` object can send translation/language detection requests to the plugin's 'Global' translator, i.e. the translator used for executing
all commands.

This translation service is specified by the `General > Translation Service` option, see the image below.

![](https://user-images.githubusercontent.com/8179397/211365088-f6e3d672-446f-4cd4-aa26-79ba51523879.png)

Every service shares the same functionality, though be aware that not all services support same list of
languages. You can check which languages are currently available by calling:
```ts
// Returns: ['en', 'fr', 'ja', 'zh']
const available_languages = api.available_languages
```

Every language is (with some exceptions), represented by an [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes),
which is the standard that Obsidian uses. As an example: `English` is represented like `en` in the standard.

If you for some reason need the full language name given a locale, you can use:
```ts
api.getLanguageName('en') // Returns: 'English'
```

When calling an API method, you will always get back an HTTP status code, which
indicates whether the request was successful or not. If the request was not successful,
you will also get a message explaining what exactly went wrong.

> [!WARNING]
> A request was successful **_only if `status_code = 200`_**

```ts
const output = await api.translate(...);

if (output.status_code === 200) {
	// ... Request was successful
} else {
	// ... Request failed, output.message contains error message
	console.log(output.message);
}
```

The most frequent issue you will encounter is that the translation service was not validated, more specifically:
```ts
const output = await api.translate(...);

console.log(output);
/**
 * {
 *   status_code: 400,
 *   message: 'Translation service not validated'
 * }
 */
```

This issue can only be solved by validating the service in the plugin's settings.


Every method below also has a base method counterpart called `service_...` (e.g.: `service_translate()`, `service_detect()`),
these base methods skip _any_ validation checks (such as whether the service is validated or not, whether all required
parameters were provided, ...).

Note that while these methods are simpler to use, they also require you to handle
parameter checking, request splitting and error handling.

More information can be found in the [handler's directory README](https://github.com/Fevol/obsidian-translate/blob/master/src/handlers/README.md).




---

### Translate
To translate a piece of text, you can use the `translate()` method:
```ts
const output = await api.translate(TEXT, FROM?, TO?, OPTIONS?)
```

> [!NOTE]
> If the `TO` parameter is not provided, the plugin will use the user-defined default language.
> This is _not_ necessarily the same as the Obsidian display language!

#### Input
- `TEXT`: Text to translate, `string`
- `FROM`: Language to translate from, `string` (ISO 639-1 code) [OPTIONAL, auto-detect if not provided]
- `TO`: Language to translate to, `string` (ISO 639-1 code) [OPTIONAL, user-defined default if not provided]
- `OPTIONS`:
	- `force_display`: Force the target language to be the Obsidian display language, `boolean`
	- `apply_glossary`: Whether to apply glossary to translation, `boolean`
	- `glossary`: Glossary to apply to translation, `string` (string) [uses user-defined glossary if not provided]
	- ... (see [types.d.ts](https://github.com/Fevol/obsidian-translate/blob/master/src/handlers/types.d.ts) for full list of options)

#### Output
Output is an object containing the following parameters:
- `translation`: (optional) Translated text, `string`
  <br>&emsp;&emsp;_Only if **successful**_
- `detected_language`: (optional) Detected language, `string` (ISO 639-1 code)
  <br>&emsp;&emsp;_Only if **successful** and `from = 'auto'`_
- `confidence`: (optional) Confidence in detected language, `number` (0-1)
  <br>&emsp;&emsp;_Only if **successful** and `from = 'auto'`_
- `message`: (optional) Translator (error) message, `string`
- `status_code`: HTTP status code, `number`

#### Examples

<details>
<summary><b>Succesful translation (automatic language detection)</b></summary>

```ts
const source_text = "Je suis un baguette"
const source_language = "auto"
const target_language = "en"

const translation_output = await api.translate(source_text, source_language, target_language);

console.log(translation_output);
/**
 * translation_output = {
 *   "translation": "I am a baguette",
 *   "detected_language": "fr",
 *   "confidence": 1.0,
 *   "status_code": 200
 * }
 */
```
</details>
<details>
<summary><b>Succesful translation (manually set source language + glossary)</b></summary>

```ts
const source_text = "Je suis un baguette"
const source_language = "fr"
const target_language = "en"
const apply_glossary = true

const translation_output = await api.translate(source_text, source_language, target_language, apply_glossary);

console.log(translation_output);
/**
 * translation_output = {
 *   "translation": "I am a baguette",
 *   "status_code": 200
 * }
 */
```
</details>
<details>
<summary><b>Failed translation (invalid language)</b></summary>

```ts
const source_text = "Je suis un baguette"
const source_language = "auto"
const target_language = "zz"

const translation_output = await api.translate(source_text, source_language, target_language);

console.log(translation_output);
/**
 * translation_output = {
 *  "message": "Invalid language code: zz",
 *  "status_code": 400
 *  }
 */
```
</details>


---

### Detect
To detect the language of a piece of text, you can use the `detect()` method:
```ts
const output = await api.detect(TEXT)
```

#### Input
- `TEXT`: Text to detect language of, `string`

#### Output
Output is an object containing the following parameters:
- `detected_language`: (optional) Detected language, `string` (ISO 639-1 code)
  <br>&emsp;&emsp;_Only if **successful**_
- `confidence`: (optional) Confidence in detected language, `number` (0-1)
  <br>&emsp;&emsp;_Only if **successful**_
- `message`: (optional) Translator (error) message, `string`
- `status_code`: HTTP status code, `number`

#### Examples

<details>
<summary><b>Succesful detection</b></summary>

```ts
const source_text = "Je suis un baguette"

const detection_output = await api.detect(source_text);

console.log(detection_output);
/**
 * detection_output = {
 *   "detected_language": "fr",
 *   "confidence": 1.0,
 *   "status_code": 200
 * }
 */
```
</details>

<details>
<summary><b>Failed detection (not validated)</b></summary>

```ts
const source_text = "Je suis un baguette"

const detection_output = await api.detect(source_text);

console.log(detection_output);
/**
 * detection_output = {
 *  "message": "Translation service not validated",
 *  "status_code": 403
 *  }
 */
