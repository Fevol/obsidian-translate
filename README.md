# Obsidian Translator Plugin



## Services overview

| Translation Service     | Supported | Free                                    | Preserves Formatting | Notes                 |
|-------------------------|-----------|-----------------------------------------|----------------------|-----------------------|
| Google Translate        | ❌         | ✅ *(0.5M characters **per month**)* ¹ ² | ✅                    |                       |
| Deepl                   | ❌         | ✅  *(0.5M characters **per month**)* ¹  | ✅                    |                       |
| Yandex Translate        | ❌         | ✅ *(5M characters)* ¹                   | ✅                    |                       |
| Libre Translate         | ✅         | ✅                                       | ❌                    | Can be hosted locally |
| Bing Translator (Azure) | ❌         | ✅  *(2M characters **per month**)*      | ✅                    |                       |

_¹ Requires a valid credit card to sign up for a free API key_<br>
_² Free 300$ credit when signing up (valid for three months)_<br> 

## Notes

- For most services, if you exceed the free character quota, you will get charged. 
- Not every translation service respects the formatting of the source text. It may be possible that this gets lost in
  the translation process.
- Make sure that you only enable automatic translation if you have a sufficiently high character cap on your API
  account, or you locally host your own translation service (e.g. with Libre Translate).
