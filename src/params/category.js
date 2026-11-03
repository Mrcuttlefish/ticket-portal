/** A category ID (numeric) or `new`. */
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return param === 'new' || /^\d{1,10}$/.test(param);
}
