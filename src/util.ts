export class DefaultDict {
	constructor(defaultVal: any) {
		return new Proxy({}, {
			get: (target, name) => name in target ? target[name as keyof typeof target] : defaultVal
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

export function getKeyValue<T extends object, U extends keyof T> (obj: T, key: U) {
	return obj[key]
}

function array_cmp(a1: Array<any>, a2: Array<any>) {
	var i = a1.length;
	if (i !== a2.length) return false;
	while (i--) {
		if (a1[i] !== a2[i]) return false;
	}
	return true
}

export function regexLastIndexOf(searchString: string, position: number, regex: RegExp) {
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



// Adapted from https://github.com/wankdanker/node-function-rate-limit/
export function rateLimit(limitCount: number, interval: number, unique: boolean, default_timeout: number, fn: (...args: any) => void) {
	// Contains set of function calls that need to be executed, limited by limitCount and executed every interval
	const fifo: any[] = [];
	const currently_running: any[] = [];
	let running = false;

	function next_call(args: any[] = []) {
		// Set up the next call to be executed after given interval
		setTimeout(function() {
			if (fifo.length)
				next_call(fifo.shift());
			else
				running = false;
		}, interval);

		// If the limiter requires unique calls, set the function to be running for args[2] specified time
		if (unique) {
			setTimeout(function() {
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

	const alg = { name: 'AES-GCM', iv: iv };                                           // specify algorithm to use

	const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']); // generate key from pw

	const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
	const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);                   // encrypt plaintext using key

	const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
	const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
	const ctBase64 = btoa(ctStr);                                                      // encode ciphertext as base64

	const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join(''); // iv as hex string

	return ivHex+ctBase64;                                                             // return iv+ciphertext
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

		const iv = ciphertext.slice(0,24).match(/.{2}/g).map(byte => parseInt(byte, 16));  // get iv from ciphertext

		const alg = { name: 'AES-GCM', iv: new Uint8Array(iv) };                           // specify algorithm to use

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
export function humanFileSize(bytes: number, si: boolean = false, dp=1) {
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh)
		return bytes + ' B';

	const units = si
		? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		: ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	let u = -1;
	const r = 10**dp;


	while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1) {
		bytes /= thresh;
		++u;
	}


	return bytes.toFixed(dp) + ' ' + units[u];
}


// Standard Normal variate using Box-Muller transform.
export function randn_bm(): number {
	let u = 0, v = 0;
	while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while(v === 0) v = Math.random();
	let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
	num = num / 10.0 + 0.5; // Translate to 0 -> 1
	if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
	return num
}

export function nested_object_assign (source: any, target: any, ignored_keys: Set<string>) {
	Object.keys(source)
		.forEach(key => {
			const s_val = source[key]
			const t_val = target[key]
			if (t_val && ignored_keys.has(key) || !ignored_keys.has(key)) {
				if (t_val) {
					// If target and source both are objects, recursively check for keys in source to add to target
					if (t_val instanceof Object && s_val instanceof Object)
						nested_object_assign(s_val, t_val, ignored_keys);
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
