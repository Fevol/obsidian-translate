# API service overview

There are as of writing 11 translation services implemented in code (but not necessarily included with the plugin):
- Amazon Translate (partially implemented, not included)
- Azure Translator
- Bergamot
- DeepL
- Google Translate
- Fanyi Baidu
- Fanyi QQ
- Fanyi Youdao
- Google Translate
- Libre Translate
- Lingva Translate
- Yandex Translate


Every service inherits from the `DummyTranslate` base class. Services functionality can be accessed
via `app.plugins.plugins['obsidian-translate'].translator`.

## Methods
Every method prefixed by `service_` is an implementation of the `DummyTranslate` base class method.
They implement the service-specific logic for executing a particular action, and are responsible for
converting the API output of a service into a unified format.

If you call a method without the `service_` prefix (i.e. `translate` vs `service_translate`), additional
input and output processing is performed (implemented in base class `DummyTranslate`).

It is _recommended_ that you **always** use the non-prefixed methods (`validate()`, `translate()`, ...), 
as these will check if the correct inputs were provided, the service is validated, automatic request splitting, etc. 

### failed() and success()
These functions update the internal failure counter, used to invalidate (block functionality) the service
after a certain number of failures.

### validate()
Validate that the service has been set up correctly, given API key, hostname, etc. If `output.validate` is true,
the service is guaranteed to work correctly.

Returns: 
```json
{
  "valid": Translation service is valid & ready to use, 				[BOOLEAN] 
  "host": Host, optional, gives the correct host address given service settings,	[STRING?] 
  "message": Optional (error) message, not always critical, 			   	[STRING?] 
  "status_code": HTTP status code, 200 if request was successful			[NUMBER?] 
}
```

### translate()
Translate a given text from a source language to a target language. If `from` input parameter is not provided,
it will default to `auto`, and leave it up to the service to determine the source language.

Input:
```json
{
  "text": Text to translate, 	[STRING]
  "from": Source language, 	[STRING]
  "to": Target language, 	[STRING]
}
```

Returns:
```json
{
  "translation": Translated text, undefined if text was not translated, 		[STRING?]
  "detected_language": Detected language, undefined if `from` was provided or not found	[STRING?]
  "confidence": Confidence in detected_language output, 1.0 if not provided by API	[STRING?]
  "message": Optional (error) message, not always critical, 				[STRING?]
  "status_code": HTTP status code, 200 if request was successful			[NUMBER?]
}
```

### detect()
Detect the language of a given text.

Input:
```json
{
  "text": Text to detect language of, 	[STRING]
}
```

Returns:
```json
{
  "detected_languages": Detected languages plus their confidence, [{language: STRING, confidence: NUMBER}]
  "message": Optional (error) message, not always critical, 	  [STRING?]
  "status_code": HTTP status code, 200 if request was successful  [NUMBER?]
}
```


### languages()
Get a list of languages supported by the service.

Returns:
```json
{
  "languages": List of languages, 					[STRING[]?]
  "message": Optional (error) message, not always critical, 		[STRING?]
  "data": Extra service-specific data, only used in bergamot service 	[STRING?]
  "status_code": HTTP status code, 200 if request was successful	[NUMBER?]
}
```

### glossary_languages()
Get a list of languages supported by the service for glossaries.

Returns:
```json
{
  "languages": List of target languages supported per source language, 	[{STRING, STRING[]}?]
  "message": Optional (error) message, not always critical, 		[STRING?]
  "status_code": HTTP status code, 200 if request was successful	[NUMBER?]
}
```
