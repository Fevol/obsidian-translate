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
