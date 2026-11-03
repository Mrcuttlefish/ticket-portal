import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	WEBHOOK_SECRET_MASK,
	cleanPingRoleRules,
	cleanRoleLimits,
	durationToInput,
	inputToDuration,
	normaliseHolidays,
	override,
	parseWebhookUrl,
	webhookSecretPayload,
	workingHoursFromForm,
	workingHoursToForm
} from '../../src/lib/util/settings.js';

test('durations round-trip', () => {
	assert.equal(durationToInput(null), '');
	assert.equal(durationToInput(0), '');
	assert.equal(durationToInput(0, { allowOff: true }), 'off');
	assert.equal(durationToInput(3_600_000), '1h');
	assert.equal(inputToDuration(''), null);
	assert.equal(inputToDuration('  '), null);
	assert.equal(inputToDuration('1h'), 3_600_000);
	assert.equal(inputToDuration('30d'), 30 * 86_400_000);
	assert.equal(inputToDuration('off', { allowOff: true }), 0);
	assert.equal(inputToDuration('0', { allowOff: true }), 0);
	assert.throws(() => inputToDuration('off'), /not a valid duration/);
	assert.throws(() => inputToDuration('soon', { field: 'Cooldown' }), /^Error: Cooldown/);
	assert.throws(() => inputToDuration('-5m'));
});

test('working hours: null and equal times are days off', () => {
	const form = workingHoursToForm([
		'Europe/London',
		null,
		['09:00', '17:00'],
		['00:00', '00:00'],
		null,
		null,
		null,
		null
	]);
	assert.equal(form[0], 'Europe/London');
	assert.deepEqual(form[1], []);
	assert.deepEqual(form[2], ['09:00', '17:00']);
	assert.deepEqual(form[3], []);
	assert.equal(form.length, 8);
});

test('working hours: days off are sent as 00:00-00:00, never null', () => {
	const out = workingHoursFromForm(['UTC', [], ['09:00', '17:00'], ['09:00', ''], [], [], [], []]);
	assert.equal(out.length, 8);
	assert.deepEqual(out[1], ['00:00', '00:00']);
	assert.deepEqual(out[2], ['09:00', '17:00']);
	assert.deepEqual(out[3], ['00:00', '00:00']);
	assert.ok(out.slice(1).every((d) => Array.isArray(d) && d.length === 2));
});

test('working hours: missing values get defaults', () => {
	const form = workingHoursToForm(undefined);
	assert.equal(form[0], 'UTC');
	assert.equal(form.length, 8);
});

test('holidays are valid, unique and sorted', () => {
	assert.deepEqual(normaliseHolidays(['2026-12-25', '2026-01-01', '2026-12-25', 'nope', '']), [
		'2026-01-01',
		'2026-12-25'
	]);
	assert.deepEqual(normaliseHolidays(undefined), []);
});

test('webhook secret is write-only', () => {
	assert.equal(
		webhookSecretPayload({ input: '', hadSecret: true, remove: false }),
		WEBHOOK_SECRET_MASK
	);
	assert.equal(webhookSecretPayload({ input: '', hadSecret: false, remove: false }), null);
	assert.equal(webhookSecretPayload({ input: 'new', hadSecret: true, remove: false }), 'new');
	assert.equal(webhookSecretPayload({ input: 'new', hadSecret: true, remove: true }), null);
});

test('webhook URLs must be https without credentials', () => {
	assert.equal(parseWebhookUrl(''), null);
	assert.equal(parseWebhookUrl(' https://example.com/hook '), 'https://example.com/hook');
	assert.throws(() => parseWebhookUrl('http://example.com'), /https/);
	assert.throws(() => parseWebhookUrl('https://user:pass@example.com'), /username/);
	assert.throws(() => parseWebhookUrl('not a url'), /valid URL/);
});

test('override select values', () => {
	assert.equal(override.toSelect(null), 'inherit');
	assert.equal(override.toSelect(undefined), 'inherit');
	assert.equal(override.toSelect(true), 'on');
	assert.equal(override.toSelect(false), 'off');
	for (const v of [null, true, false]) assert.equal(override.fromSelect(override.toSelect(v)), v);
});

test('role limits drop incomplete rows and duplicates', () => {
	assert.deepEqual(
		cleanRoleLimits([
			{ role: '1', limit: 2 },
			{ role: '', limit: 3 },
			{ role: '2', limit: '' },
			{ role: '1', limit: '5' },
			{ role: '3', limit: 500 },
			{ role: '4', limit: -1 }
		]),
		[
			{ role: '1', limit: 5 },
			{ role: '3', limit: 100 }
		]
	);
});

test('ping rules need creator roles', () => {
	assert.deepEqual(
		cleanPingRoleRules([
			{ roles: ['1', '1'], ping: ['2'] },
			{ roles: [], ping: ['3'] },
			{ roles: ['4'] }
		]),
		[
			{ roles: ['1'], ping: ['2'] },
			{ roles: ['4'], ping: [] }
		]
	);
});
