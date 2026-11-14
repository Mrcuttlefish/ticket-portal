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

test('P3: automation rules round-trip and are checked', async () => {
	const { automationsFromForm, automationsToForm } = await import('../../src/lib/util/settings.js');
	const form = automationsToForm([
		{ action: 'TAG', after: 4 * 3_600_000, tag: 'waiting', waitingOn: 'STAFF' },
		{ action: 'CLOSE', after: 2 * 86_400_000, waitingOn: 'CREATOR' }
	]);
	assert.deepEqual(form[0], { action: 'TAG', after: '4h', tag: 'waiting', waitingOn: 'STAFF' });
	assert.deepEqual(form[1], { action: 'CLOSE', after: '2d', tag: '', waitingOn: 'CREATOR' });
	assert.deepEqual(automationsFromForm(form), [
		{ action: 'TAG', after: 4 * 3_600_000, tag: 'waiting', waitingOn: 'STAFF' },
		{ action: 'CLOSE', after: 2 * 86_400_000, waitingOn: 'CREATOR' }
	]);
	assert.throws(() => automationsFromForm([{ ...form[0], after: '5m' }]), /15 minutes/);
	assert.throws(() => automationsFromForm([{ ...form[0], after: '' }]), /required/);
	assert.throws(() => automationsFromForm([{ ...form[0], tag: '' }]), /choose a tag/);
	assert.deepEqual(automationsToForm(null), []);
});

test('P3: button role limits are sent with the button customisation', async () => {
	const { buttonRolesToForm } = await import('../../src/lib/util/settings.js');
	const roles = buttonRolesToForm({ close: { deny: ['1'] } });
	assert.deepEqual(roles.close, { allow: [], deny: ['1'] });
	roles.claim.allow = ['2', '2'];
	assert.deepEqual(buttonsFromForm(buttonsToForm({ close: { label: 'Done' } }), roles), {
		claim: { allow: ['2'] },
		close: { deny: ['1'], label: 'Done' }
	});
});
