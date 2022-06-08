# Obsidian Translator Plugin



## Services overview

| Translation Service     | Supported | Free                                    | Preserves Formatting | Languages | Notes                 |
|-------------------------|-----------|-----------------------------------------|----------------------|-----------|-----------------------|
| Google Translate        | ❌         | ✅ *(0.5M characters **per month**)* ¹ ² | ✅                    | 109       |                       |
| Deepl                   | ❌         | ✅  *(0.5M characters **per month**)* ¹  | ✅                    | 28        |                       |
| Yandex Translate        | ❌         | ✅ *(5M characters)* ¹                   | ✅                    | 93        |                       |
| Libre Translate         | ✅         | ✅                                       | ❌                    | 30        | Can be hosted locally |
| Bing Translator (Azure) | ✅         | ✅  *(2M characters **per month**)*      | ✅                    | 111       |                       |

_¹ Requires a valid credit card to sign up for a free API key_<br>
_² Free 300$ credit when signing up (valid for three months)_<br> 

## Notes

- For most services, if you exceed the free character quota, you will get charged. 
- Not every translation service respects the formatting of the source text. It may be possible that this gets lost in
  the translation process.
- Make sure that you only enable automatic translation if you have a sufficiently high character cap on your API
  account, or you locally host your own translation service (e.g. with Libre Translate).
