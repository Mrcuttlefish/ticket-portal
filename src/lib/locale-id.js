// Finds the locale and namespace in a locale file's path, e.g. ".../locales/en-GB/_common.json"
// gives locale "en-GB" and namespace "common". It's anchored to the end of the path: an
// unanchored pattern matched folders above src/ (a build in /tmp/tmp.AbC123/ gave locale
// "tmp"), so no translation could be found and the dashboard never finished loading.
export const LOCALE_ID_REGEX =
	/\/locales\/(?<locale>[a-z0-9-_]+)\/(?:_(?<namespace>[a-z0-9-_]+)|[a-z0-9-_]+)\.json$/i;
