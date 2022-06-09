import type {PluginData, TranslatorPluginSettings} from "./types";

// Add list of icons
export const ICONS = {
	"bing_translator": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 32 32\"><path fill=\"currentColor\" d=\"M6.1 0l6.392 2.25v22.5l9.004-5.198-4.414-2.070-2.785-6.932 14.186 4.984v7.246l-15.986 9.22-6.397-3.558z\"></path></svg>",
	"deepl": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 32 32\"><path fill=\"currentColor\" d=\"M27.289 6.134l-10.188-5.813c-0.688-0.375-1.563-0.375-2.25 0l-10.188 5.813c-0.688 0.375-1.125 1.125-1.125 1.937v11.875c0 0.813 0.438 1.563 1.125 1.938l17.563 10.125v-7.188l5.063-2.938c0.688-0.375 1.125-1.125 1.125-1.938v-11.875c0.063-0.813-0.438-1.563-1.125-1.938zM14.414 19.196c0 1.188-0.938 2.125-2.125 2.125s-2.125-0.938-2.125-2.125c0-1.188 0.938-2.125 2.125-2.125 0.563 0 1 0.188 1.375 0.5l3.75-2.125c0.188 0.438 0.438 0.875 0.688 1.25l-3.75 2.125c0.063 0.125 0.063 0.25 0.063 0.375zM20.914 16.384c-1.188 0-2.125-0.938-2.125-2.125 0-0.125 0-0.25 0.063-0.375l-5.125-2.938c-0.375 0.313-0.875 0.5-1.375 0.5-1.188 0-2.125-0.938-2.125-2.125s0.938-2.125 2.125-2.125c1.188 0 2.125 0.938 2.125 2.125 0 0.125 0 0.25-0.063 0.375l5.125 2.938c0.375-0.313 0.875-0.563 1.438-0.563 1.188 0 2.125 0.938 2.125 2.125-0.063 1.188-1 2.188-2.188 2.188z\"></path></svg>",
	"google_translate": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 32 32\"><path fill=\"currentColor\" d=\"M4 1.333c-1.48 0-2.667 1.187-2.667 2.667v18.667c0 1.48 1.187 2.667 2.667 2.667h16l-8-24h-8zM16.453 6.667l0.88 2.667h10.667v18.667h-11.493l0.867 2.667h10.627c1.48 0 2.667-1.187 2.667-2.667v-18.667c0-1.48-1.187-2.667-2.667-2.667h-11.547zM9.413 7.88c1.467 0 2.707 0.533 3.627 1.453l-1.493 1.373c-0.387-0.387-1.053-0.827-2.133-0.827-1.853 0-3.333 1.52-3.333 3.373s1.48 3.413 3.333 3.413c2.16 0 2.933-1.56 3.093-2.333h-3.093v-1.827h5.093c0.067 0.307 0.080 0.52 0.080 0.907 0 3.093-2.080 5.253-5.173 5.253-3 0-5.413-2.413-5.413-5.413 0-3.013 2.413-5.373 5.413-5.373zM21.333 13.333v1.333h-2.213l0.427 1.333h4.453c-0.36 0.813-0.493 1.56-1.587 2.84-0.533-0.627-0.96-1.173-1.080-1.507h-1.333c0.16 0.573 0.827 1.467 1.627 2.373-0.173 0.173-0.413 0.4-0.627 0.587l0.373 1.12c0.333-0.293 0.667-0.6 1-0.907 1.36 1.427 2.8 2.747 2.8 2.747l0.747-0.8c0 0-1.427-1.4-2.707-2.787 0.84-0.933 1.587-2.067 2.12-3.667h1.333v-1.333h-4v-1.333h-1.333z\"></path></svg>",
	"translate": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 32 32\"><path fill=\"currentColor\" d=\"M32 28.8h-2.304c-0.017 0.001-0.037 0.002-0.056 0.002-0.22 0-0.423-0.073-0.586-0.195l0.003 0.002c-0.158-0.132-0.284-0.298-0.365-0.488l-0.003-0.008-1.488-4.112h-8l-1.6 4.064c-0.080 0.192-0.2 0.353-0.35 0.478l-0.002 0.002c-0.164 0.14-0.377 0.224-0.611 0.224-0.010 0-0.020-0-0.030-0l0.001 0h-2.208l7.28-18.352h3.024zM26.352 21.904l-2.528-6.704c-0.205-0.517-0.419-1.178-0.595-1.855l-0.029-0.129q-0.144 0.592-0.304 1.104l-0.304 0.896-2.528 6.704zM16.272 19.376c-1.779-0.618-3.317-1.38-4.739-2.307l0.083 0.051c2.172-2.328 3.749-5.238 4.473-8.47l0.023-0.122h3.088v-2.128h-7.504c-0.098-0.352-0.207-0.65-0.336-0.936l0.016 0.040c-0.384-1.040-0.816-2.304-0.816-2.304l-2.352 0.8s0.64 1.424 0.96 2.4h-9.168v2.128h3.44c0.747 3.364 2.349 6.278 4.566 8.599l-0.006-0.007c-2.3 1.453-4.968 2.607-7.81 3.32l-0.19 0.040q0.896 1.312 1.392 2.208c3.188-1.083 5.949-2.442 8.495-4.104l-0.143 0.088c1.64 1.111 3.522 2.068 5.521 2.778l0.175 0.054zM5.808 8.528h7.856c-0.542 2.834-1.941 5.276-3.912 7.113l-0.008 0.007c-1.905-1.896-3.288-4.314-3.917-7.022l-0.019-0.098z\"></path></svg>",
	"libre_translate": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 32 32\"><path fill=\"currentColor\" d=\"M31.381 10.744l-1.7 2.1q-7.615-3.915-10.916-8.158-3.229 4.472-10.415 7.987l-1.814-2.029q9.558-4.429 11.844-10.644l2.429 0.757q-0.486 1.429-0.643 1.672 3.086 4.415 11.216 8.315zM31.838 24.346l-1.872 1.786q-4.186-3.2-6.486-7.815-1.514 4.286-6.272 7.758l-1.872-1.729q3.315-2.2 4.972-5.186t1.886-8.515l2.515 0.214q0 0.743-0.114 1.857l-0.1 1q0 0.757 0.843 2.857 0.857 2.086 2.486 4.058 1.643 1.957 4.015 3.715zM18.565 20.545l-1.943 1.743q-1.643-2.157-3.215-3.529-1.8 3.929-5.586 7.401l-1.9-1.7q3.4-3.029 4.886-6.086 1.5-3.058 1.929-7.729l2.543 0.271q-0.286 2.6-1.014 5.301 2.772 2.386 4.3 4.329z\"></path><path fill=\"currentColor\" d=\"M12.749 31.969v-2.277h-9.997v-17.967h-2.583v20.244z\"></path></svg>",
	"yandex_translate": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 32 32\"><path fill=\"none\" stroke-linejoin=\"miter\" stroke-linecap=\"butt\" stroke-miterlimit=\"4\" stroke-width=\"0.5717\" stroke=\"#000\" d=\"M29.955 22.736c-1.448 2.709-3.741 5.706-8.070 7.777-0.189-0.52-12.053-28.497-12.118-28.658 3.749-1.228 7.496-2.32 13.356 0.611 2.571 1.496 7.77 5.562 8.148 12.365 0.188 2.566 0.087 4.905-1.316 7.904z\"></path><path fill=\"currentColor\" d=\"M26.724 13.692c-0.401-0.917-1.124-1.631-2.023-2.010l-0.025-0.009c0.168-0.745 0.223-1.359 0.242-1.768h-1.675c-0.034 0.487-0.1 0.936-0.198 1.373l0.011-0.061c-1.303-0.186-2.774 0-4.189 0.503-0.158-0.912-0.261-1.768-0.316-2.513 5.036-0.279 8.005-1.471 8.144-1.536l-0.633-1.508c-0.028 0-2.848 1.117-7.567 1.396 0-1.126-0.037-1.117 0.019-1.499l-1.675-0.019c-0.037 0.316-0.028 0.652-0.019 1.582h-0.158c-1.508 0-2.904-0.112-3.239-0.14l-0.307 1.666c0.493 0.037 2.001 0.121 3.351 0.121h0.205l0.214-0.009c0.065 0.931 0.186 2.011 0.41 3.183-2.225 1.303-4.002 3.816-3.090 5.864 0.372 0.856 1.108 1.415 2.048 1.554 0.168 0.019 0.335 0.037 0.503 0.037 0.959 0 2.057-0.382 3.109-1.033 0.395 0.593 0.821 1.111 1.294 1.582l0 0 1.154-1.201c-0.019-0.009-0.503-0.465-1.117-1.387 1.321-1.241 2.356-2.77 3.007-4.488l0.027-0.082c0.372 0.214 0.745 0.531 0.949 1.015 0.67 1.629-0.298 3.518-1.21 4.337l1.145 1.21c1.508-1.368 2.541-3.919 1.62-6.162zM16.503 18.225c-0.353-0.031-0.646-0.258-0.77-0.571l-0.002-0.006c-0.41-0.94 0.484-2.485 1.955-3.509 0.372 1.303 0.838 2.42 1.312 3.314-0.894 0.558-1.815 0.875-2.494 0.773zM20.701 15.991l-0.372 0.391c-0.41-0.838-0.819-1.843-1.117-3.034 0.853-0.352 1.844-0.557 2.882-0.557 0.181 0 0.361 0.006 0.539 0.018l-0.024-0.001c-0.467 1.23-1.113 2.289-1.918 3.204l0.010-0.012z\"></path><path fill=\"currentColor\" d=\"M3.294 6.553c-4.087 4.989-4.13 13.687-1.171 17.55 4.571 7.459 12.936 9.666 20.199 6.512l-12.844-28.933c-3.756 1.758-5.094 3.562-6.183 4.871zM9.72 12.030h1.76l5.454 12.604h-2.234l-1.34-3.361h-5.519l-1.342 3.361h-2.232zM10.595 14.628l-2.029 4.941h4.069z\"></path></svg>",
	"google_translate_attribution": "<svg width=\"122px\" height=\"16px\" viewBox=\"0 0 122 16\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:sketch=\"http://www.bohemiancoding.com/sketch/ns\"><title>greyscale-short</title><desc>Created with Sketch.</desc><defs></defs><g id=\"Page-1\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\" sketch:type=\"MSPage\"><g id=\"greyscale-short\" sketch:type=\"MSLayerGroup\"><g id=\"Imported-Layers-Copy-2\" transform=\"translate(73.000000, 0.127273)\" fill=\"#757575\" sketch:type=\"MSShapeGroup\"><path d=\"M6.16,5.45866667 L6.16,7.09733333 L10.082,7.09733333 C9.96466667,8.01933333 9.65733333,8.69266667 9.18933333,9.16066667 C8.618,9.73133333 7.72533333,10.3606667 6.16,10.3606667 C3.74466667,10.3606667 1.85733333,8.41466667 1.85733333,6 C1.85733333,3.58533333 3.74466667,1.63933333 6.16,1.63933333 C7.462,1.63933333 8.41333333,2.15133333 9.116,2.81 L10.272,1.65333333 C9.29133333,0.717333333 7.98933333,7.10542736e-15 6.16,7.10542736e-15 C2.85266667,7.10542736e-15 0.072,2.69266667 0.072,6 C0.072,9.30733333 2.85266667,12 6.16,12 C7.94466667,12 9.29133333,11.4146667 10.3453333,10.3173333 C11.428,9.234 11.7646667,7.712 11.7646667,6.48266667 C11.7646667,6.10266667 11.7353333,5.75133333 11.6766667,5.45866667 L6.16,5.45866667\" id=\"Fill-10\"></path><path d=\"M16.6666667,4.12733333 C14.5253333,4.12733333 12.7793333,5.756 12.7793333,8 C12.7793333,10.2293333 14.5253333,11.8726667 16.6666667,11.8726667 C18.8086667,11.8726667 20.554,10.2293333 20.554,8 C20.554,5.756 18.8086667,4.12733333 16.6666667,4.12733333 L16.6666667,4.12733333 Z M16.6666667,10.3466667 C15.4933333,10.3466667 14.4806667,9.37866667 14.4806667,8 C14.4806667,6.60666667 15.4933333,5.65266667 16.6666667,5.65266667 C17.84,5.65266667 18.8526667,6.60666667 18.8526667,8 C18.8526667,9.37866667 17.84,10.3466667 16.6666667,10.3466667 L16.6666667,10.3466667 Z\" id=\"Fill-11\"></path><path d=\"M35.72,4.99333333 L35.6613333,4.99333333 C35.2793333,4.538 34.546,4.12733333 33.622,4.12733333 C31.686,4.12733333 30,5.814 30,8 C30,10.1706667 31.686,11.8726667 33.622,11.8726667 C34.546,11.8726667 35.2793333,11.462 35.6613333,10.9926667 L35.72,10.9926667 L35.72,11.534 C35.72,13.0153333 34.928,13.8073333 33.6513333,13.8073333 C32.61,13.8073333 31.9646667,13.0593333 31.7006667,12.4286667 L30.2193333,13.0446667 C30.6446667,14.0713333 31.774,15.3333333 33.6513333,15.3333333 C35.6466667,15.3333333 37.3333333,14.16 37.3333333,11.2993333 L37.3333333,4.32666667 L35.72,4.32666667 L35.72,4.99333333 L35.72,4.99333333 Z M33.7693333,10.3466667 C32.596,10.3466667 31.702,9.34933333 31.702,8 C31.702,6.636 32.596,5.65266667 33.7693333,5.65266667 C34.9286667,5.65266667 35.8373333,6.65066667 35.8373333,8.01466667 C35.8373333,9.364 34.9286667,10.3466667 33.7693333,10.3466667 L33.7693333,10.3466667 Z\" id=\"Fill-12\"></path><path d=\"M25.3333333,4.12733333 C23.192,4.12733333 21.446,5.756 21.446,8 C21.446,10.2293333 23.192,11.8726667 25.3333333,11.8726667 C27.4753333,11.8726667 29.2206667,10.2293333 29.2206667,8 C29.2206667,5.756 27.4753333,4.12733333 25.3333333,4.12733333 L25.3333333,4.12733333 Z M25.3333333,10.3466667 C24.16,10.3466667 23.148,9.37866667 23.148,8 C23.148,6.60666667 24.16,5.65266667 25.3333333,5.65266667 C26.5066667,5.65266667 27.5193333,6.60666667 27.5193333,8 C27.5193333,9.37866667 26.5066667,10.3466667 25.3333333,10.3466667 L25.3333333,10.3466667 Z\" id=\"Fill-13\"></path><path d=\"M38.6666667,0.16 L40.34,0.16 L40.34,11.8726667 L38.6666667,11.8726667 L38.6666667,0.16 Z\" id=\"Fill-14\"></path><path d=\"M45.51,10.3466667 C44.6446667,10.3466667 44.0286667,9.95133333 43.632,9.174 L48.81,7.032 L48.634,6.592 C48.3113333,5.72666667 47.3286667,4.12733333 45.3193333,4.12733333 C43.324,4.12733333 41.6666667,5.69733333 41.6666667,8 C41.6666667,10.1713333 43.3093333,11.8726667 45.51,11.8726667 C47.2846667,11.8726667 48.3113333,10.7873333 48.7366667,10.156 L47.4166667,9.276 C46.9766667,9.922 46.3753333,10.3466667 45.51,10.3466667 L45.51,10.3466667 Z M45.384,5.57866667 C46.0726667,5.57866667 46.656,5.92933333 46.8506667,6.43266667 L43.3533333,7.88266667 C43.3533333,6.25 44.508,5.57866667 45.384,5.57866667 L45.384,5.57866667 Z\" id=\"Fill-15\"></path></g><text id=\"translated-by-copy\" opacity=\"0.54\" sketch:type=\"MSTextLayer\" font-family=\"Roboto\" font-size=\"12\" font-weight=\"normal\" fill=\"#000000\"><tspan x=\"0\" y=\"12\">translated by</tspan></text></g></g></svg>",
	"bing_translator_attribution": "<svg id=\"MS-symbol\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\t viewBox=\"0 0 337.6 72\" style=\"enable-background:new 0 0 337.6 72;\" xml:space=\"preserve\"><style type=\"text/css\">\t.st0{fill:#737373;}\t.st1{fill:#F25022;}\t.st2{fill:#7FBA00;}\t.st3{fill:#00A4EF;}\t.st4{fill:#FFB900;}</style><path class=\"st0\" d=\"M140.4,14.4v43.2h-7.5V23.7h-0.1l-13.4,33.9h-5l-13.7-33.9h-0.1v33.9h-6.9V14.4h10.8l12.4,32h0.2l13.1-32H140.4\tz M146.6,17.7c0-1.2,0.4-2.2,1.3-3c0.9-0.8,1.9-1.2,3.1-1.2c1.3,0,2.4,0.4,3.2,1.2s1.3,1.8,1.3,3c0,1.2-0.4,2.2-1.3,3\tc-0.9,0.8-1.9,1.2-3.2,1.2s-2.3-0.4-3.1-1.2C147.1,19.8,146.6,18.8,146.6,17.7z M154.7,26.6v31h-7.3v-31H154.7z M176.8,52.3\tc1.1,0,2.3-0.2,3.6-0.8c1.3-0.5,2.5-1.2,3.6-2v6.8c-1.2,0.7-2.5,1.2-4,1.5c-1.5,0.3-3.1,0.5-4.9,0.5c-4.6,0-8.3-1.4-11.1-4.3\tc-2.9-2.9-4.3-6.6-4.3-11c0-5,1.5-9.1,4.4-12.3c2.9-3.2,7-4.8,12.4-4.8c1.4,0,2.8,0.2,4.1,0.5c1.4,0.3,2.5,0.8,3.3,1.2v7\tc-1.1-0.8-2.3-1.5-3.4-1.9c-1.2-0.4-2.4-0.7-3.6-0.7c-2.9,0-5.2,0.9-7,2.8s-2.6,4.4-2.6,7.6c0,3.1,0.9,5.6,2.6,7.3\tC171.6,51.4,173.9,52.3,176.8,52.3z M204.7,26.1c0.6,0,1.1,0,1.6,0.1s0.9,0.2,1.2,0.3v7.4c-0.4-0.3-0.9-0.6-1.7-0.8\ts-1.6-0.4-2.7-0.4c-1.8,0-3.3,0.8-4.5,2.3s-1.9,3.8-1.9,7v15.6h-7.3v-31h7.3v4.9h0.1c0.7-1.7,1.7-3,3-4\tC201.2,26.6,202.8,26.1,204.7,26.1z M207.9,42.6c0-5.1,1.5-9.2,4.3-12.2c2.9-3,6.9-4.5,12-4.5c4.8,0,8.6,1.4,11.3,4.3\ts4.1,6.8,4.1,11.7c0,5-1.5,9-4.3,12c-2.9,3-6.8,4.5-11.8,4.5c-4.8,0-8.6-1.4-11.4-4.2C209.3,51.3,207.9,47.4,207.9,42.6z\t M215.5,42.3c0,3.2,0.7,5.7,2.2,7.4s3.6,2.6,6.3,2.6c2.6,0,4.7-0.8,6.1-2.6c1.4-1.7,2.1-4.2,2.1-7.6c0-3.3-0.7-5.8-2.1-7.6\tc-1.4-1.7-3.5-2.6-6-2.6c-2.7,0-4.7,0.9-6.2,2.7C216.2,36.5,215.5,39,215.5,42.3z M250.5,34.8c0,1,0.3,1.9,1,2.5\tc0.7,0.6,2.1,1.3,4.4,2.2c2.9,1.2,5,2.5,6.1,3.9c1.2,1.5,1.8,3.2,1.8,5.3c0,2.9-1.1,5.2-3.4,7c-2.2,1.8-5.3,2.6-9.1,2.6\tc-1.3,0-2.7-0.2-4.3-0.5c-1.6-0.3-2.9-0.7-4-1.2v-7.2c1.3,0.9,2.8,1.7,4.3,2.2c1.5,0.5,2.9,0.8,4.2,0.8c1.6,0,2.9-0.2,3.6-0.7\tc0.8-0.5,1.2-1.2,1.2-2.3c0-1-0.4-1.8-1.2-2.6c-0.8-0.7-2.4-1.5-4.6-2.4c-2.7-1.1-4.6-2.4-5.7-3.8s-1.7-3.2-1.7-5.4\tc0-2.8,1.1-5.1,3.3-6.9c2.2-1.8,5.1-2.7,8.6-2.7c1.1,0,2.3,0.1,3.6,0.4s2.5,0.6,3.4,0.9V34c-1-0.6-2.1-1.2-3.4-1.7\tc-1.3-0.5-2.6-0.7-3.8-0.7c-1.4,0-2.5,0.3-3.2,0.8C250.9,33.1,250.5,33.8,250.5,34.8z M266.9,42.6c0-5.1,1.5-9.2,4.3-12.2\tc2.9-3,6.9-4.5,12-4.5c4.8,0,8.6,1.4,11.3,4.3s4.1,6.8,4.1,11.7c0,5-1.5,9-4.3,12c-2.9,3-6.8,4.5-11.8,4.5c-4.8,0-8.6-1.4-11.4-4.2\tC268.4,51.3,266.9,47.4,266.9,42.6z M274.5,42.3c0,3.2,0.7,5.7,2.2,7.4s3.6,2.6,6.3,2.6c2.6,0,4.7-0.8,6.1-2.6\tc1.4-1.7,2.1-4.2,2.1-7.6c0-3.3-0.7-5.8-2.1-7.6c-1.4-1.7-3.5-2.6-6-2.6c-2.7,0-4.7,0.9-6.2,2.7C275.3,36.5,274.5,39,274.5,42.3z\t M322.9,32.6h-10.9v25h-7.4v-25h-5.2v-6h5.2v-4.3c0-3.2,1.1-5.9,3.2-8s4.8-3.1,8.1-3.1c0.9,0,1.7,0.1,2.4,0.1s1.3,0.2,1.8,0.4v6.3\tc-0.2-0.1-0.7-0.3-1.3-0.5c-0.6-0.2-1.3-0.3-2.1-0.3c-1.5,0-2.7,0.5-3.5,1.4c-0.8,0.9-1.2,2.4-1.2,4.2v3.7h10.9v-7l7.3-2.2v9.2h7.4\tv6h-7.4v14.5c0,1.9,0.4,3.2,1,4c0.7,0.8,1.8,1.2,3.3,1.2c0.4,0,0.9-0.1,1.5-0.3c0.6-0.2,1.1-0.4,1.5-0.7v6c-0.5,0.3-1.2,0.5-2.3,0.7\tc-1.1,0.2-2.1,0.3-3.2,0.3c-3.1,0-5.4-0.8-6.9-2.4c-1.5-1.6-2.3-4.1-2.3-7.4L322.9,32.6L322.9,32.6z\"/><g>\t<rect class=\"st1\" width=\"34.2\" height=\"34.2\"/>\t<rect x=\"37.8\" class=\"st2\" width=\"34.2\" height=\"34.2\"/>\t<rect y=\"37.8\" class=\"st3\" width=\"34.2\" height=\"34.2\"/>\t<rect x=\"37.8\" y=\"37.8\" class=\"st4\" width=\"34.2\" height=\"34.2\"/></g></svg>",
}

export const DEFAULT_DATA: PluginData = {
	available_languages: [],
	all_languages: new Map(),
	current_language: "",
	spellchecker_languages: [],
	text_to: "",
	text_from: "",
	detected_language: "",
}

export const DEFAULT_SETTINGS: TranslatorPluginSettings = {
	// Selected languages are stored such that when toggling between syncing spellchecker languages will preserve the user selection
	//FIXME: Temporary default, should be either empty or display language initially?
	selected_languages: ['en', 'fr', 'nl'],
	use_spellchecker_languages: false,
	filter_service_languages: false,
	display_language: 'display',
	language_from: '',
	language_to: '',
	translation_service: 'google_translate',
	service_settings: {
		google_translate: {
			api_key: "",
			region: null,
			host: null,
			auto_translate: false,
			auto_translate_interval: '',
			validated: null,
			available_languages: [
				'af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'co', 'cs', 'cy', 'da', 'de', 'el', 'en',
				'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'fy', 'ga', 'gd', 'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hmn',
				'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky',
				'la', 'lb', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'no',
				'ny', 'or', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'rw', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq',
				'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'ug', 'uk', 'ur', 'uz',
				'vi', 'xh', 'yi', 'yo', 'zh', 'zh-TW', 'zu'
			]
		},
		bing_translator: {
			api_key: "",
			region: "",
			host: null,
			auto_translate: false,
			auto_translate_interval: '',
			validated: null,
			// FIXME: Account for dialects
			available_languages: [
				'af', 'am', 'ar', 'as', 'az', 'ba', 'bg', 'bn', 'bo', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'dv', 'el',
				'en', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fj', 'fo', 'fr', 'fr-ca', 'ga', 'gl', 'gu', 'he', 'hi',
				'hr', 'hsb', 'ht', 'hu', 'hy', 'id', 'ikt', 'is', 'it', 'iu', 'iu-Latn', 'ja', 'ka', 'kk', 'km', 'kmr',
				'kn', 'ko', 'ku', 'ky', 'lo', 'lt', 'lv', 'lzh', 'mg', 'mi', 'mk', 'ml', 'mn-Cyrl', 'mn-Mong', 'mr',
				'ms', 'mt', 'mww', 'my', 'nb', 'ne', 'nl', 'or', 'otq', 'pa', 'pl', 'prs', 'ps', 'pt', 'pt-pt', 'ro',
				'ru', 'sk', 'sl', 'sm', 'so', 'sq', 'sr-Cyrl', 'sr-Latn', 'sv', 'sw', 'ta', 'te', 'th', 'ti', 'tk',
				'tlh-Latn', 'tlh-Piqd', 'to', 'tr', 'tt', 'ty', 'ug', 'uk', 'ur', 'uz', 'vi', 'yua', 'yue', 'zh-Hans',
				'zh-Hant', 'zu'
			]
		},
		yandex_translate: {
			api_key: "",
			region: null,
			host: null,
			auto_translate: false,
			auto_translate_interval: '',
			validated: null,
			available_languages: [
				'af', 'am', 'ar', 'az', 'ba', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'cs', 'cy', 'da', 'de', 'el', 'en',
				'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gd', 'gl', 'gu', 'he', 'hi', 'hr', 'ht', 'hu', 'hy',
				'id', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg',
				'mhr', 'mi', 'mk', 'ml', 'mn', 'mr', 'mrj', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'pa', 'pap', 'pl',
				'pt', 'ro', 'ru', 'si', 'sk', 'sl', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tl',
				'tr', 'tt', 'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'zh'
			]
		},
		libre_translate: {
			api_key: null,
			region: null,
			host: "https://libretranslate.com",
			auto_translate: false,
			auto_translate_interval: '',
			validated: null,
			available_languages: ['ar', 'az', 'cs', 'da', 'de', 'el', 'en', 'eo', 'es', 'fa', 'fi', 'fr', 'ga', 'he',
				'hi', 'hu', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'sk', 'sv', 'tr', 'uk', 'vi', 'zh']
		},
		deepl: {
			api_key: "",
			region: null,
			host: null,
			auto_translate: false,
			auto_translate_interval: '',
			validated: null,
			// FIXME: Account for dialects
			available_languages: ['bg', 'cs', 'da', 'de', 'el', 'en-gb', 'en-us', 'es', 'et', 'fi', 'fr', 'hu', 'id',
				'it', 'ja', 'lt', 'lv', 'nl', 'pl', 'pt-br', 'pt-pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'zh']
		}
	},
}


export const TRANSLATION_SERVICES_INFO: { [key: string]: any } = {
	google_translate: {
		request_key: "https://cloud.google.com/translate/docs/setup",
		url: "https://cloud.google.com/translate/docs/",
		attribution: "google_translate_attribution",
	},
	bing_translator: {
		request_key: "https://www.microsoft.com/en-us/translator/business/translator-api/",
		url: "https://www.microsoft.com/en-us/translator/",
		attribution: "bing_translator_attribution",
		region_options: [
			{value: '', text: 'Global'},
			{value: 'asia', text: 'Asia'},
			{value: 'asiapacific', text: 'Asia Pacific'},
			{value: 'australia', text: 'Australia'},
			{value: 'australiacentral', text: 'Australia Central'},
			{value: 'australiacentral2', text: 'Australia Central 2'},
			{value: 'australiaeast', text: 'Australia East'},
			{value: 'australiasoutheast', text: 'Australia Southeast'},
			{value: 'brazil', text: 'Brazil'},
			{value: 'brazilsouth', text: 'Brazil South'},
			{value: 'brazilsoutheast', text: 'Brazil Southeast'},
			{value: 'canada', text: 'Canada'},
			{value: 'canadacentral', text: 'Canada Central'},
			{value: 'canadaeast', text: 'Canada East'},
			{value: 'centralindia', text: 'Central India'},
			{value: 'centralus', text: 'Central US'},
			{value: 'centraluseuap', text: 'Central US EUAP'},
			{value: 'eastasia', text: 'East Asia'},
			{value: 'eastus', text: 'East US'},
			{value: 'eastus2', text: 'East US 2'},
			{value: 'eastus2euap', text: 'East US 2 EUAP'},
			{value: 'europe', text: 'Europe'},
			{value: 'france', text: 'France'},
			{value: 'francecentral', text: 'France Central'},
			{value: 'francesouth', text: 'France South'},
			{value: 'germany', text: 'Germany'},
			{value: 'germanynorth', text: 'Germany North'},
			{value: 'germanywestcentral', text: 'Germany West Central'},
			{value: 'global', text: 'Global'},
			{value: 'india', text: 'India'},
			{value: 'japan', text: 'Japan'},
			{value: 'japaneast', text: 'Japan East'},
			{value: 'japanwest', text: 'Japan West'},
			{value: 'korea', text: 'Korea'},
			{value: 'koreacentral', text: 'Korea Central'},
			{value: 'koreasouth', text: 'Korea South'},
			{value: 'northcentralus', text: 'North Central US'},
			{value: 'northeurope', text: 'North Europe'},
			{value: 'norway', text: 'Norway'},
			{value: 'norwayeast', text: 'Norway East'},
			{value: 'norwaywest', text: 'Norway West'},
			{value: 'southafrica', text: 'South Africa'},
			{value: 'southafricanorth', text: 'South Africa North'},
			{value: 'southafricawest', text: 'South Africa West'},
			{value: 'southcentralus', text: 'South Central US'},
			{value: 'southindia', text: 'South India'},
			{value: 'southeastasia', text: 'Southeast Asia'},
			{value: 'swedencentral', text: 'Sweden Central'},
			{value: 'switzerland', text: 'Switzerland'},
			{value: 'switzerlandnorth', text: 'Switzerland North'},
			{value: 'switzerlandwest', text: 'Switzerland West'},
			{value: 'uaecentral', text: 'UAE Central'},
			{value: 'uaenorth', text: 'UAE North'},
			{value: 'uksouth', text: 'UK South'},
			{value: 'ukwest', text: 'UK West'},
			{value: 'unitedstates', text: 'United States'},
			{value: 'westcentralus', text: 'West Central US'},
			{value: 'westeurope', text: 'West Europe'},
			{value: 'westindia', text: 'West India'},
			{value: 'westus', text: 'West US'},
			{value: 'westus2', text: 'West US 2'},
			{value: 'westus3', text: 'West US 3'}
		]
	},
	yandex_translate: {
		request_key: "https://yandex.com/dev/translate/",
		url: "https://translate.yandex.com/"
	},
	deepl: {
		request_key: "https://www.deepl.com/pro-api?cta=header-pro-api/",
		url: "https://www.deepl.com/",
	},
	libre_translate: {
		local_host: "https://github.com/LibreTranslate/LibreTranslate",
		url: "https://libretranslate.com/",
	}
}

export const AUTO_TRANSLATE_INTERVALS = [
	{value: '', text: 'Instantly'},
	{value: 'finished', text: '... seconds after you stopped typing'},
	{value: 'every', text: 'Translate every ...'},
];


export const TRANSLATOR_VIEW_ID = "translator-view";
