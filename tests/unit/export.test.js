import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canManageData, filenameFrom } from '../../src/lib/util/export.js';

test("the bot's canManageData wins (owners and super users)", () => {
	assert.equal(canManageData({ canManageData: true, ownerId: '1' }, { id: '2' }), true);
	assert.equal(canManageData({ canManageData: false, ownerId: '1' }, { id: '1' }), false);
});

test('only the owner can export when the bot says who the owner is', () => {
	assert.equal(canManageData({ ownerId: '1' }, { id: '1' }), true);
	assert.equal(canManageData({ ownerId: '1' }, { id: '2' }), false);
	assert.equal(canManageData({ ownerId: '1' }, null), false);
});

test('without an ownerId (older bot) the option is shown and the API decides', () => {
	assert.equal(canManageData({}, { id: '2' }), true);
	assert.equal(canManageData(null, null), true);
});

test('download names come from Content-Disposition and cannot contain paths', () => {
	assert.equal(filenameFrom('attachment; filename="backup.zip"', 'x'), 'backup.zip');
	assert.equal(filenameFrom("attachment; filename*=UTF-8''my%20backup.zip", 'x'), 'my backup.zip');
	assert.equal(filenameFrom('attachment; filename="../../evil.zip"', 'x'), '.._.._evil.zip');
	assert.equal(filenameFrom(null, 'fallback.zip'), 'fallback.zip');
});
