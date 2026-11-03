/** Discord IDs: only route requests whose segment is a valid snowflake. */
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^\d{17,20}$/.test(param);
}
