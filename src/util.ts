export function toTitleCase(str: string) {
	return str.replace(/\w\S*/g, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

export function getKeyValue<T extends object, U extends keyof T> (obj: T, key: U) {
	return obj[key]
}

// Adapted from https://github.com/wankdanker/node-function-rate-limit/
export function rateLimit(limitCount: number, interval: number, fn: (...args: any) => void) {
	// Contains set of function calls that need to be executed, limited by limitCount and executed every interval
	const fifo: any[] = [];
	let running = false;

	function next_call(args: any[] = []) {
		// If priority was given, bypass FIFO queue and execute immediately
		if (args[2]) {
			fn.apply(args[0], args[1]);
			return;
		}


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
			if (!running) {
				running = true;
				next_call(fifo.shift());
				return;
			}
		}
	};
}

String.prototype.format = function () {
	var i = 0, args = arguments;
	return this.replace(/{}/g, function () {
		return typeof args[i] != 'undefined' ? args[i++] : '';
	});
};
