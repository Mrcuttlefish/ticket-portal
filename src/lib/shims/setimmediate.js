// Replaces the "setimmediate" polyfill that jszip loads. That polyfill turns a string
// argument into code with new Function(), which the dashboard's CSP (no 'unsafe-eval')
// forbids and which we never want in the bundle. This version only accepts functions.
const g = globalThis;

if (typeof g.setImmediate !== 'function') {
	g.setImmediate = (fn, ...args) => {
		if (typeof fn !== 'function') throw new TypeError('setImmediate needs a function');
		return setTimeout(fn, 0, ...args);
	};
	g.clearImmediate = (id) => clearTimeout(id);
}
