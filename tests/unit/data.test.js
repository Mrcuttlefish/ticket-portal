import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten } from '../../src/lib/util/data.js';

test('a thrown string is shown as one message', () => {
	assert.deepEqual(flatten('Something is wrong.'), [['message', 'Something is wrong.']]);
});

test('an Error is shown by its message', () => {
	assert.deepEqual(flatten(new Error('Nope')), [['message', 'Nope']]);
});

test('API error bodies keep their fields', () => {
	assert.deepEqual(flatten({ error: 'Bad Request', statusCode: 400 }), [
		['error', 'Bad Request'],
		['statusCode', '400']
	]);
});
