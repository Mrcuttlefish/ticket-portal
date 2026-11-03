/** Guild IDs in short (base 36) form, as used by the public portal. */
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^[0-9a-z]{1,13}$/i.test(param);
}
