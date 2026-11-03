import { test } from 'node:test';
import assert from 'node:assert/strict';
import { match as snowflake } from '../../src/params/snowflake.js';
import { match as category } from '../../src/params/category.js';
import { match as base36 } from '../../src/params/base36.js';

test('snowflake matcher', () => {
	assert.ok(snowflake('451745464480432129'));
	for (const bad of [
		'',
		'123',
		'<img src=x>',
		'../users/@me',
		'45174546448043212a',
		'1'.repeat(21)
	]) {
		assert.equal(snowflake(bad), false, bad);
	}
});

test('category matcher', () => {
	assert.ok(category('new'));
	assert.ok(category('42'));
	for (const bad of ['', 'New', '-1', '1.5', '<x>', '../../', '12345678901'])
		assert.equal(category(bad), false, bad);
});

test('base36 matcher', () => {
	assert.ok(base36(BigInt('451745464480432129').toString(36)));
	for (const bad of ['favicon.ico', '', '<x>', 'a-b']) assert.equal(base36(bad), false, bad);
});
