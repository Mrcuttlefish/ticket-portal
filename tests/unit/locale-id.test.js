import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { LOCALE_ID_REGEX } from '../../src/lib/locale-id.js';

const parse = (path) => ({ ...LOCALE_ID_REGEX.exec(path)?.groups });

test('locale and namespace come from the locale file path', () => {
	assert.deepEqual(parse('/app/src/lib/locales/en-GB/_common.json'), {
		locale: 'en-GB',
		namespace: 'common'
	});
	assert.deepEqual(parse('/app/src/lib/locales/en-GB/misc.json'), {
		locale: 'en-GB',
		namespace: undefined
	});
});

test('folders above the project do not change the locale', () => {
	// scripts/update-dashboard.sh in the bot builds in a mktemp folder like this
	for (const root of [
		'/tmp/tmp.AbC123/portal',
		'/home/runner/work/x/x',
		'C:/Users/me/tmp.dir/portal'
	]) {
		assert.deepEqual(parse(`${root}/src/lib/locales/en-GB/_common.json`), {
			locale: 'en-GB',
			namespace: 'common'
		});
	}
});

test('every locale file is recognised', () => {
	const dir = new URL('../../src/lib/locales/', import.meta.url);
	for (const locale of readdirSync(dir)) {
		for (const file of readdirSync(new URL(`${locale}/`, dir))) {
			assert.equal(parse(`/x/src/lib/locales/${locale}/${file}`).locale, locale, file);
		}
	}
});
