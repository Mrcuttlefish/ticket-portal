import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	ApiError,
	formatBytes,
	fromSlug,
	listTickets,
	resolveMentions,
	sendMessage,
	toSlug,
	upsertMessage
} from '../../src/lib/api/tickets.js';

const fakeFetch = (status, body) => {
	const calls = [];
	const fn = async (url, options) => {
		calls.push({ url, options });
		return new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' }
		});
	};
	fn.calls = calls;
	return fn;
};

test('slugs round-trip guild IDs', () => {
	for (const id of ['451745464480432129', '1094120827601047653', '100000000000000000']) {
		assert.equal(fromSlug(toSlug(id)), id);
	}
});

test('listTickets only sends set filters', async () => {
	const fetch = fakeFetch(200, { tickets: [], next: null });
	await listTickets(fetch, '1', {
		open: true,
		q: 'login',
		category: '',
		creator: undefined,
		cursor: null
	});
	assert.equal(fetch.calls[0].url, '/api/guilds/1/tickets?open=true&q=login');
	await listTickets(fetch, '1');
	assert.equal(fetch.calls[1].url, '/api/guilds/1/tickets');
});

test('sendMessage posts JSON with credentials', async () => {
	const fetch = fakeFetch(201, { id: '1' });
	await sendMessage(fetch, '1', '2', 'hello');
	const { url, options } = fetch.calls[0];
	assert.equal(url, '/api/guilds/1/tickets/2/messages');
	assert.equal(options.method, 'POST');
	assert.equal(options.credentials, 'include');
	assert.equal(options.headers['Content-Type'], 'application/json');
	assert.deepEqual(JSON.parse(options.body), { content: 'hello' });
});

test('API errors carry the status and message', async () => {
	await assert.rejects(
		sendMessage(
			fakeFetch(409, { error: 'Conflict', message: 'This ticket is closed' }),
			'1',
			'2',
			'x'
		),
		(err) =>
			err instanceof ApiError && err.status === 409 && err.message === 'This ticket is closed'
	);
});

test('mentions become readable text', () => {
	const refs = {
		users: { '200000000000000001': { displayName: 'Helper' } },
		roles: { '200000000000000002': { name: 'Staff' } },
		channels: { '200000000000000003': { name: 'general' } }
	};
	assert.equal(
		resolveMentions(
			'<@200000000000000001> <@!200000000000000001> <@&200000000000000002> <#200000000000000003>',
			refs
		),
		'@Helper @Helper @Staff #general'
	);
	assert.equal(resolveMentions('<@200000000000000009>'), '@unknown-user');
	assert.equal(
		resolveMentions('<:blob:200000000000000004> <a:wave:200000000000000005>'),
		':blob: :wave:'
	);
	assert.equal(resolveMentions(null), '');
});

test('formatBytes', () => {
	assert.equal(formatBytes(512), '512 B');
	assert.equal(formatBytes(2048), '2.0 KB');
	assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
	assert.equal(formatBytes(-1), '');
});

test('upsertMessage dedupes and keeps order', () => {
	const a = { id: '1', createdAt: '2026-01-01T00:00:00Z', content: 'a' };
	const b = { id: '2', createdAt: '2026-01-02T00:00:00Z', content: 'b' };
	let list = upsertMessage([b], a);
	assert.deepEqual(
		list.map((m) => m.id),
		['1', '2']
	);
	list = upsertMessage(list, { ...b, deleted: true });
	assert.equal(list.length, 2);
	assert.equal(list[1].deleted, true);
});
