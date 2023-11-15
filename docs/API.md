This README contains examples on how to access the plugin API, how you can make
translation requests, and more. This API is intended for both plugin developers,
as well as casual users that want to incorporate translations into their workflow.

Please open an issue if you have any suggestions or ideas on how to improve the API and its documentation.


## Set-up API
If the plugin is properly installed and enabled, you can access the translator API like this:
```ts
const translator = app.plugins.plugins['translate']?.translator
```
(Developer note: if your IDE gives an error on this line, you may have to `//@ts-ignore` it,
or add typings for `app.plugins.plugins`, see [here](https://github.com/Fevol/obsidian-translate/blob/ae0adc1abbb67fd99c5c9b427bea7b08a60c57f8/src/typings/obsidian-ex.d.ts#L113-L119))

Now that you have the `translator` object, check whether it is actually available:
```ts
if (!translator) {
    // ... Disable translation functionality if not available
}
```

In order to actually send requests, you should also check whether the service has been validated.
You can do this with:
```ts
if (translator.valid) {
	// Service is fully valid
}
```

All in all, you should at least call this code before using any of the methods:
```ts
const translator = app.plugins.plugins['translate']?.translator
if (translator && translator.valid) {
	translator.translate('Hello world!', 'en', 'de')
}
```




## API methods
### Introduction
The retrieved `translator` object represents the plugin's 'Global' translator, i.e. the translator used for executing
all commands.

This translation service is determined by the `General > Translation Service` option, see the image below.

![](https://user-images.githubusercontent.com/8179397/211365088-f6e3d672-446f-4cd4-aa26-79ba51523879.png)

Every service shares the same functionality, though be aware that not all services support same list of
languages. You can check which languages are currently available by calling:
```ts
// Returns: ['en', 'fr', 'ja', 'zh']
const available_languages = translator.available_languages
```

Every language is (with some exceptions), represented by an [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes),
which is the standard that Obsidian uses. As an example: `English` is represented like `en` in the standard.

When calling an API method, you will always get back a HTTP status code, this will
indicate whether the request was successful or not. If the request was not successful,
you will also get a message explaining what went wrong.

A request was successful **_only if `status_code = 200`_**

```ts
const output = translator.translate(...);

if (output.status_code === 200) {
	// ... Request was successful
} else {
	// ... Request failed, output.message contains error message
	console.log(output.message);
}
```

The most frequent issue you will encounter is that the translation service was not validated, more specifically:
```ts
const output = translator.translate(...);

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
parameters were provided, ...). Note that while these methods are simpler to use, they also require you to handle
parameter checking, request splitting and error handling.

More information can be found in the [handler's directory README](https://github.com/Fevol/obsidian-translate/blob/master/src/handlers/README.md).




---

### Translate
To translate a piece of text, you can use the `translate()` method:
```ts
const output = await translator.translate(TEXT, FROM, TO, APPLY_GLOSSARY?)
```

#### Input
- `TEXT`: Text to translate, `string`
- `FROM`: Language to translate from, `string` (ISO 639-1 code)
- `TO`: Language to translate to, `string` (ISO 639-1 code)
- `APPLY_GLOSSARY`: (optional) Apply glossary to translation, `boolean`

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

const translation_output = await translator.translate(source_text, source_language, target_language);

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

const translation_output = await translator.translate(source_text, source_language, target_language, apply_glossary);

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

const translation_output = await translator.translate(source_text, source_language, target_language);

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
const output = await translator.detect(TEXT)
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

const detection_output = await translator.detect(source_text);

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

const detection_output = await translator.detect(source_text);

console.log(detection_output);
/**
 * detection_output = {
 *  "message": "Translation service not validated",
 *  "status_code": 403
 *  }
 */
