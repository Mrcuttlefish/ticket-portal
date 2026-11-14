import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buttonsFromForm,
	buttonsToForm,
	creatorRolesFromForm,
	creatorRolesToForm,
	optionalText
} from '../../src/lib/util/settings.js';

test('button customisation round-trips and drops defaults', () => {
	const form = buttonsToForm({ close: { label: 'Done', style: 'SUCCESS' } });
	assert.deepEqual(form.close, { emoji: '', label: 'Done', style: 'SUCCESS' });
	assert.deepEqual(form.claim, { emoji: '', label: '', style: '' });
	form.claim.emoji = ' 🙋 ';
	form.reopen.label = '   ';
	assert.deepEqual(buttonsFromForm(form), {
		claim: { emoji: '🙋' },
		close: { label: 'Done', style: 'SUCCESS' }
	});
	assert.deepEqual(buttonsFromForm(buttonsToForm(null)), {});
	form.edit.label = 'x'.repeat(81);
	assert.throws(() => buttonsFromForm(form), /too long/);
});

test('creator roles round-trip, drop empty events and limit roles', () => {
	const form = creatorRolesToForm({ open: { add: ['1'], remove: [] } });
	assert.deepEqual(form.open, { add: ['1'], remove: [] });
	assert.deepEqual(form.close, { add: [], remove: [] });
	form.close.remove = ['1', '2'];
	form.claim.add = ['3', '3'];
	form.claim.remove = ['3'];
	assert.deepEqual(creatorRolesFromForm(form), {
		claim: { add: ['3'], remove: [] },
		close: { add: [], remove: ['1', '2'] },
		open: { add: ['1'], remove: [] }
	});
	form.open.add = Array.from({ length: 11 }, (_, i) => String(i + 10));
	assert.throws(() => creatorRolesFromForm(form), /at most 10/);
});

test('optional messages turn blank into null', () => {
	assert.equal(optionalText(''), null);
	assert.equal(optionalText('  '), null);
	assert.equal(optionalText(null), null);
	assert.equal(optionalText(' hi '), 'hi');
});
