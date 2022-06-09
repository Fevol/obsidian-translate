# Obsidian Translator Plugin



## Services overview

| Translation Service     | Supported | Free                                    | Preserves Formatting | Languages | Notes                 |
|-------------------------|-----------|-----------------------------------------|----------------------|-----------|-----------------------|
| Google Translate        | ❓         | ✅ *(0.5M characters **per month**)* ¹ ² | ❓                    | 109       |                       |
| Deepl                   | ❓         | ✅  *(0.5M characters **per month**)* ¹  | ❓                    | 28        |                       |
| Yandex Translate        | ❓         | ✅ *(5M characters)* ¹                   | ❓                    | 93        |                       |
| Libre Translate         | ✅         | ✅                                       | ❌                    | 30        | Can be hosted locally |
| Bing Translator (Azure) | ✅         | ✅  *(2M characters **per month**)*      | ❓                    | 111       |                       |
| Amazon Translate        | ⭕         | ✅  *(2M characters **per month**)* ³    |                      |           |                       |

_¹ Requires a valid credit card to sign up for a free API key_<br>
_² Free 300$ credit when signing up (valid for three months)_<br>
_³ Free for a year after signing up_

| Symbol | Description                       |
|--------|-----------------------------------|
| ✅      | Fully tested, **_should_** work   |
| ❌      | Fully tested, **does _not_** work |
| ❓      | Implemented, needs to be tested   |
| ⭕      | Not implemented                   |




## Notes

- For most services, if you exceed the free character quota, you will get charged. 
- Not every translation service respects the formatting of the source text. It may be possible that this gets lost in
  the translation process.
- Make sure that you _only_ enable automatic translation if you have a sufficiently high character cap on your API
  account, or you locally host your own translation service (e.g. with Libre Translate).


## Future plans
- More ways of ensuring that auto-translate doesn't eat away at the character quota
- Improving reliability of the translation service handlers

## Discussion and Feedback

Feedback would *very* much be appreciated. Please use the [GitHub issue tracker]() to report bugs, request features, or
suggest improvements. I am still not sure what the end goal for this plugin is, so I would love to hear your ideas.

