export function toTitleCase(str: string) {
	return str.replace(/\w\S*/g, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

// Custom fetch function with timeout
// export function fetchTimeout(url: string, ms: number, {signal, ...options} = {}) {
// 	const controller = new AbortController();
// 	const promise = fetch(url, {signal: controller.signal, ...options});
// 	if (signal) signal.addEventListener("abort", () => controller.abort());
// 	const timeout = setTimeout(() => controller.abort(), ms);
// 	return promise.finally(() => clearTimeout(timeout));
// };

export function getKeyValue<T extends object, U extends keyof T> (obj: T, key: U) {
	return obj[key]
}


// Adapted from https://github.com/wankdanker/node-function-rate-limit/
export function rateLimit(limitCount: number, interval: number, fn: (arg0: any, arg1: any) => void) {
	// Contains set of function calls that need to be executed, limited by limitCount and executed every interval
	const fifo: any[] = [];
	let running = false;

	function next_call(args: any[] = []) {
		// If queue is empty, throttler can stop running
		if (!args.length) {
			running = false;
			return;
		}

		// Set up the next call to be executed after given interval
		setTimeout(function() {
			next_call(fifo.shift());
		}, interval);

		// Execute the function
		fn.apply(args[0], args[1]);
	}

	return function rate_limited_function() {
		const ctx = this;
		const args = Array.prototype.slice.call(arguments);

		// If queue is full, ignore incomming function call
		// LimitCount of 0 means that only one function call can be executed at a time
		if (!fifo.length || fifo.length < limitCount) {
			fifo.push([ctx, args]);
			console.log(fifo.length, running);
			if (!running) {
				running = true;
				next_call(fifo.shift());
				return;
			}
		}
	};
}
