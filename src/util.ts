import type {TranslatorHotKey} from "./types";
import {Modifier, Platform} from "obsidian";

export class DefaultDict {
	constructor(init: any = {}, value: any) {
		return new Proxy(init, {
			get: (target, name) => name in target ? target[name as keyof typeof target] : value
		})
	}
}

export function toTitleCase(str: string) {
	return str.replace(/\w\S*/g, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

export function toSentenceCase(str: string) {
	return str.toLowerCase().replace(/(^\w|\.\s*\w)/gi, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

export function getKeyValue<T extends object, U extends keyof T>(obj: T, key: U) {
	return obj[key]
}

export function array_cmp(a1: Array<any>, a2: Array<any>) {
	if (a1 === a2) return true;
	if (a1 == null || a2 == null) return false;
	let i = a1.length;
	if (i !== a2.length) return false;
	while (i--)
		if (a1[i] !== a2[i]) return false;
	return true
}

export function regexIndexOf(searchString: string, regex: RegExp, position?: number) {
	const indexOf = searchString.substring(position || 0).search(regex);
	return (indexOf >= 0) ? (indexOf + (position || 0)) : indexOf;
}

export function regexLastIndexOf(searchString: string, regex: RegExp, position?: number) {
	regex = regex.global ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiline ? "m" : ""));
	if (position == null)
		position = searchString.length;
	else if (position < 0)
		position = 0;

	const stringToWorkWith = searchString.substring(0, position + 1);
	let lastIndexOf = -1;
	let nextStop = 0;
	let result;
	while ((result = regex.exec(stringToWorkWith)) != null) {
		lastIndexOf = result.index;
		regex.lastIndex = ++nextStop;
	}
	return lastIndexOf;
}

export function removePunctuation(str: string) {
	return str.replace(/\p{P}/gu, "");
}


// Adapted from https://github.com/wankdanker/node-function-rate-limit/
export function rateLimit(limitCount: number, interval: number, unique: boolean, default_timeout: number, fn: (...args: any) => void) {
	// Contains set of function calls that need to be executed, limited by limitCount and executed every interval
	const fifo: any[] = [];
	const currently_running: any[] = [];
	let running = false;

	function next_call(args: any[] = []) {
		// Set up the next call to be executed after given interval
		setTimeout(function () {
			if (fifo.length)
				next_call(fifo.shift());
			else
				running = false;
		}, interval);

		// If the limiter requires unique calls, set the function to be running for args[2] specified time
		if (unique) {
			setTimeout(function () {
				if (!fifo)
					// Safeguard: clear currently_running if fifo is empty
					currently_running.length = 0;
				else
					currently_running.shift();
			}, args[2] || default_timeout);
		}

		// Execute the function
		fn.apply(args[0], args[1]);
	}

	return function rate_limited_function() {
		const ctx = this;
		const args = Array.prototype.slice.call(arguments);

		// If queue is full, ignore incoming function call
		// LimitCount of 0 means that only one function call can be executed at a time
		if (!limitCount || fifo.length < limitCount) {
			// When call has priority, bypass FIFO queue and execute immediately (also disregards uniqueness property)
			if (args[2]) {
				fn.apply(ctx, args);
			} else {
				// If limiter is unique, only one function call with the same arguments can be executed at a time
				if ((unique && !currently_running.find(x => array_cmp(x, args))) || !unique) {
					if (unique)
						currently_running.push(args);
					fifo.push([ctx, args]);
				}

				// Start up rate limiter when not active
				if (!running && fifo.length) {
					running = true;
					next_call(fifo.shift());
				}
			}
		}
	}
}

function S4() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

export function generateIdentifier(length: number = 16) {
	let str = "";
	for (let i = 0; i < length / 4; i++)
		str += S4();
	return str.substring(0, length);
};

String.prototype.format = function () {
	var i = 0, args = arguments;
	return this.replace(/{}/g, function () {
		return typeof args[i] != 'undefined' ? args[i++] : '';
	});
};


// Taken from https://gist.github.com/deweller/13015c28ff6ef981693545b664591b01

/**
 * Encrypts plaintext using AES-GCM with supplied password, for decryption with aesGcmDecrypt().
 *                                                                      (c) Chris Veness MIT Licence
 *
 * @param   {String} plaintext - Plaintext to be encrypted.
 * @param   {String} password - Password to use to encrypt plaintext.
 * @returns {String} Encrypted ciphertext.
 *
 * @example
 *   const ciphertext = await aesGcmEncrypt('my secret text', 'pw');
 *   aesGcmEncrypt('my secret text', 'pw').then(function(ciphertext) { console.log(ciphertext); });
 */
export async function aesGcmEncrypt(plaintext: string, password: string) {
	if (!password || !plaintext)
		return plaintext;

	const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
	const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

	const iv = crypto.getRandomValues(new Uint8Array(12));                             // get 96-bit random iv

	const alg = {name: 'AES-GCM', iv: iv};                                           // specify algorithm to use

	const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']); // generate key from pw

	const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
	const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);                   // encrypt plaintext using key

	const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
	const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
	const ctBase64 = btoa(ctStr);                                                      // encode ciphertext as base64

	const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join(''); // iv as hex string

	return ivHex + ctBase64;                                                             // return iv+ciphertext
}


/**
 * Decrypts ciphertext encrypted with aesGcmEncrypt() using supplied password.
 *                                                                      (c) Chris Veness MIT Licence
 *
 * @param   {String} ciphertext - Ciphertext to be decrypted.
 * @param   {String} password - Password to use to decrypt ciphertext.
 * @returns {String} Decrypted plaintext.
 *
 * @example
 *   const plaintext = await aesGcmDecrypt(ciphertext, 'pw');
 *   aesGcmDecrypt(ciphertext, 'pw').then(function(plaintext) { console.log(plaintext); });
 */
export async function aesGcmDecrypt(ciphertext: string, password: string) {
	try {
		if (!password || !ciphertext)
			return ciphertext;

		const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
		const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

		const iv = ciphertext.slice(0, 24).match(/.{2}/g).map(byte => parseInt(byte, 16));  // get iv from ciphertext

		const alg = {name: 'AES-GCM', iv: new Uint8Array(iv)};                           // specify algorithm to use

		const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']); // use pw to generate key

		const ctStr = atob(ciphertext.slice(24));                                          // decode base64 ciphertext
		const ctUint8 = new Uint8Array(new ArrayBuffer(ctStr.length));
		for (let i = 0; i < ctStr.length; i++) {
			ctUint8[i] = ctStr.charCodeAt(i);
		}

		const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8);                // decrypt ciphertext using key
		const plaintext = new TextDecoder().decode(plainBuffer);                           // decode password from UTF-8

		return plaintext;                                                                  // return the plaintext
	} catch (e) {
		console.log("Error decrypting: password is incorrect");
		return ciphertext;
	}

}


// Adapted from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function humanFileSize(bytes: number, si: boolean = false, dp = 1) {
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh)
		return bytes + ' B';

	const units = si
		? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		: ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	let u = -1;
	const r = 10 ** dp;


	while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1) {
		bytes /= thresh;
		++u;
	}


	return bytes.toFixed(dp) + ' ' + units[u];
}


// Standard Normal variate using Box-Muller transform.
export function randn_bm(): number {
	let u = 0, v = 0;
	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();
	let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	num = num / 10.0 + 0.5; // Translate to 0 -> 1
	if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
	return num
}

export function nested_object_assign(source: any, target: any, ignored_keys: Set<string>) {
	Object.keys(source)
		.forEach(key => {
			const s_val = source[key]
			const t_val = target[key]
			if (t_val && ignored_keys.has(key) || !ignored_keys.has(key)) {
				if (t_val) {
					// If target and source both are objects, recursively check for keys in source to add to target
					if (!Array.isArray(t_val) && t_val instanceof Object && s_val instanceof Object) {
						nested_object_assign(s_val, t_val, ignored_keys);
					}
				} else {
					// Filter out ignored keys in s_val object
					if (s_val instanceof Object && !(s_val instanceof Array))
						target[key] = Object.fromEntries(Object.entries(s_val).filter(([k, v]) => !ignored_keys.has(k)));
					else
						target[key] = s_val;
				}
			}
		})
	return target
}

const modifier_resolver: Record<Modifier, string> = Platform.isSafari ? {
	"Mod": "⌘",
	"Ctrl": "Cmd",
	"Meta": "Cmd",
	"Alt": "⌥",
	"Shift": "Shift",
} : {
	"Mod": "Ctrl",
	"Ctrl": "Ctrl",
	"Meta": "Win",
	"Alt": "Alt",
	"Shift": "Shift",
};

export function getHotKeyString(hotkey: TranslatorHotKey) {
	return `${!hotkey.modifiers.length ? '' : `${hotkey.modifiers.map(mod => modifier_resolver[mod]).join(' + ')} + `}${hotkey.key}`
}


type Reverser<T extends Record<PropertyKey, PropertyKey>> = {
	[P in keyof T as T[P]]: P
}


// Fanyi Baidu has its own weird ISO system for language codes, not quite 639-3, making up their own codes for some languages
// In order to not have to store 200 more three letter key codes for all of Obsidian's supported languages, it's more efficient
// to just convert from 639-3 to 639-1 and back again
export const iso639_3to1: Record<string, string> = {
	"ach": "ace",
	"afr": "af",
	"aka": "ak",
	"alb": "sq",
	"amh": "am",
	"ara": "ar",
	"arg": "an",
	"arm": "hy",
	"arq": "arq",
	"asm": "as",
	"ast": "ast",
	"aym": "ay",
	"aze": "az",
	"bak": "ba",
	"bal": "bal",
	"baq": "eu",
	"bel": "be",
	"bem": "bem",
	"ben": "bn",
	"ber": "ber",
	"bho": "bho",
	"bis": "bi",
	"bli": "bli",
	"bos": "bs",
	"bre": "br",
	"bul": "bg",
	"bur": "my",
	"cat": "ca",
	"ceb": "ceb",
	"chr": "chr",
	"cht": "cht",
	"chv": "cv",
	"cor": "kw",
	"cos": "co",
	"cre": "cr",
	"cri": "cri",
	"cs": "cs",
	"dan": "da",
	"de": "de",
	"div": "dv",
	"el": "el",
	"en": "en",
	"eno": "eno",
	"epo": "eo",
	"est": "et",
	"fao": "fo",
	"fil": "fil",
	"fin": "fi",
	"fra": "fr",
	"frm": "frm",
	"fry": "fy",
	"ful": "ff",
	"geo": "ka",
	"gla": "gd",
	"gle": "ga",
	"glg": "gl",
	"glv": "gv",
	"gra": "gra",
	"grn": "gn",
	"guj": "gu",
	"hak": "hak",
	"hau": "ha",
	"haw": "haw",
	"heb": "he",
	"hi": "hi",
	"hil": "hil",
	"hkm": "km",
	"hmn": "hr",
	"hrv": "ht",
	"ht": "hu",
	"hu": "hup",
	"hup": "ig",
	"ibo": "is",
	"ice": "id",
	"id": "io",
	"ido": "iu",
	"iku": "ia",
	"ina": "ing",
	"ing": "it",
	"ir": "fa",
	"it": "kab",
	"jav": "kah",
	"jp": "ja",
	"kab": "kn",
	"kah": "ks",
	"kal": "kr",
	"kan": "rw",
	"kas": "ky",
	"kau": "kli",
	"kin": "kok",
	"kir": "kg",
	"kli": "ko",
	"kok": "ku",
	"kon": "lag",
	"kor": "lo",
	"kur": "la",
	"lag": "lv",
	"lao": "li",
	"lat": "ln",
	"lav": "lt",
	"lim": "log",
	"lin": "loj",
	"lit": "los",
	"log": "lb",
	"loj": "lg",
	"los": "mk",
	"ltz": "mh",
	"lug": "mai",
	"mac": "ml",
	"mah": "mi",
	"mai": "mr",
	"mal": "mau",
	"mao": "ms",
	"mar": "mg",
	"mau": "mt",
	"may": "mot",
	"mg": "nr",
	"mlt": "nea",
	"mot": "ne",
	"nbl": "nl",
	"nea": "nn",
	"nep": "nb",
	"nl": "no",
	"nno": "nqo",
	"nob": "ny",
	"nor": "oc",
	"nqo": "oj",
	"nya": "or",
	"oci": "om",
	"oji": "os",
	"ori": "pam",
	"orm": "pa",
	"oss": "pap",
	"pam": "ped",
	"pan": "fa",
	"pap": "pl",
	"ped": "pot",
	"per": "pt",
	"pl": "ps",
	"pot": "qu",
	"pt": "ro",
	"pus": "rm",
	"que": "rom",
	"ro": "ru",
	"roh": "ruy",
	"rom": "sa",
	"ru": "sec",
	"ruy": "sha",
	"san": "sil",
	"sec": "si",
	"sha": "sk",
	"sil": "sk",
	"sin": "sm",
	"sk": "se",
	"slo": "sn",
	"sm": "sd",
	"sme": "sol",
	"sna": "so",
	"snd": "st",
	"sol": "es",
	"som": "src",
	"sot": "sc",
	"spa": "sr",
	"src": "su",
	"srd": "sw",
	"srp": "sv",
	"sun": "syr",
	"swa": "ta",
	"swe": "tt",
	"syr": "te",
	"tam": "tet",
	"tat": "tg",
	"tel": "tl",
	"tet": "th",
	"tgk": "ti",
	"tgl": "tr",
	"th": "ts",
	"tir": "tua",
	"tr": "tk",
	"tso": "tw",
	"tua": "uk",
	"tuk": "ur",
	"twi": "ve",
	"ukr": "vi",
	"ups": "wen",
	"urd": "wa",
	"ven": "wo",
	"vie": "xh",
	"wel": "yi",
	"wln": "yo",
	"wol": "yue",
	"wyw": "lzh",
	"xho": "zh",
	"yid": "zu",
	"fri": "fur",
	"frn": "fr-CA"
}

export const iso639_1to3: Record<string, string> = {
	"ach": "ach",
	"af": "afr",
	"ak": "aka",
	"sq": "alb",
	"am": "amh",
	"ar": "ara",
	"an": "arg",
	"hy": "arm",
	"arq": "arq",
	"as": "asm",
	"ast": "ast",
	"ay": "aym",
	"az": "aze",
	"ba": "bak",
	"bal": "bal",
	"eu": "baq",
	"be": "bel",
	"bem": "bem",
	"bn": "ben",
	"ber": "ber",
	"bho": "bho",
	"bi": "bis",
	"bli": "bli",
	"bs": "bos",
	"br": "bre",
	"bg": "bul",
	"my": "bur",
	"ca": "cat",
	"ceb": "ceb",
	"chr": "chr",
	"cht": "cht",
	"cv": "chv",
	"kw": "cor",
	"co": "cos",
	"cr": "cre",
	"cri": "cri",
	"cs": "cs",
	"da": "dan",
	"de": "de",
	"dv": "div",
	"el": "el",
	"en": "en",
	"eno": "eno",
	"eo": "epo",
	"et": "est",
	"fo": "fao",
	"fil": "fil",
	"fi": "fin",
	"fr": "fra",
	"frm": "frm",
	"fy": "fry",
	"ff": "ful",
	"ka": "geo",
	"gd": "gla",
	"ga": "gle",
	"gl": "glg",
	"gv": "glv",
	"gra": "gra",
	"gn": "grn",
	"gu": "guj",
	"hak": "hak",
	"ha": "hau",
	"haw": "haw",
	"he": "heb",
	"hi": "hi",
	"hil": "hil",
	"km": "hkm",
	"hr": "hmn",
	"ht": "hrv",
	"hu": "ht",
	"hup": "hu",
	"ig": "hup",
	"is": "ibo",
	"id": "ice",
	"io": "id",
	"iu": "ido",
	"ia": "iku",
	"ing": "ina",
	"it": "ing",
	"fa": "pan",
	"kab": "it",
	"kah": "jav",
	"ja": "jp",
	"kn": "kab",
	"ks": "kah",
	"kr": "kal",
	"rw": "kan",
	"ky": "kas",
	"kli": "kau",
	"kok": "kin",
	"kg": "kir",
	"ko": "kli",
	"ku": "kok",
	"lag": "kon",
	"lo": "kor",
	"la": "kur",
	"lv": "lag",
	"li": "lao",
	"ln": "lat",
	"lt": "lav",
	"log": "lim",
	"loj": "lin",
	"los": "lit",
	"lb": "log",
	"lg": "loj",
	"mk": "los",
	"mh": "ltz",
	"mai": "lug",
	"ml": "mac",
	"mi": "mah",
	"mr": "mai",
	"mau": "mal",
	"ms": "mao",
	"mg": "mar",
	"mt": "mau",
	"mot": "may",
	"nr": "mg",
	"nea": "mlt",
	"ne": "mot",
	"nl": "nbl",
	"nn": "nea",
	"nb": "nep",
	"no": "nl",
	"nqo": "nno",
	"ny": "nob",
	"oc": "nor",
	"oj": "nqo",
	"or": "nya",
	"om": "oci",
	"os": "oji",
	"pam": "ori",
	"pa": "orm",
	"pap": "oss",
	"ped": "pam",
	"pl": "pap",
	"pot": "ped",
	"pt": "per",
	"ps": "pl",
	"qu": "pot",
	"ro": "pt",
	"rm": "pus",
	"rom": "que",
	"ru": "ro",
	"ruy": "roh",
	"sa": "rom",
	"sec": "ru",
	"sha": "ruy",
	"sil": "san",
	"si": "sec",
	"sk": "sil",
	"sm": "sin",
	"se": "sk",
	"sn": "slo",
	"sd": "sm",
	"sol": "sme",
	"so": "sna",
	"st": "snd",
	"es": "sol",
	"src": "som",
	"sc": "sot",
	"sr": "spa",
	"su": "src",
	"sw": "srd",
	"sv": "srp",
	"syr": "sun",
	"ta": "swa",
	"tt": "swe",
	"te": "syr",
	"tet": "tam",
	"tg": "tat",
	"tl": "tel",
	"th": "tet",
	"ti": "tgk",
	"tr": "tgl",
	"ts": "th",
	"tua": "tir",
	"tk": "tr",
	"tw": "tso",
	"uk": "tua",
	"ur": "tuk",
	"ve": "twi",
	"vi": "ukr",
	"wen": "ups",
	"wa": "urd",
	"wo": "ven",
	"xh": "vie",
	"yi": "wel",
	"yo": "wln",
	"yue": "wol",
	"lzh": "wyw",
	"zh": "xho",
	"zu": "yid",
	"fur": "fri",
	"fr-CA": "frn"
}
