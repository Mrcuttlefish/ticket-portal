// Serves the built site (build/handler.js) the way the bot does, with a mock API in front.
// Requests the mock received are exposed at GET /__requests for assertions.
import http from 'node:http';
import { handler } from '../../build/handler.js';
import * as f from './fixtures.js';

const port = Number(process.env.PORT || 5173);
const requests = [];

// portal state (mutable: replies and closes)
const tickets = f.portalTickets();
const messages = f.portalMessages();
/** @type {Map<string, Set<import('node:http').ServerResponse>>} */
const streams = new Map();
const emit = (ticketId, event, data) => {
	for (const res of streams.get(ticketId) ?? [])
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const json = (res, status, body) => {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
};

const readBody = (req) =>
	new Promise((resolve) => {
		let body = '';
		req.on('data', (c) => (body += c));
		req.on('end', () => resolve(body));
	});

const g = `/api/admin/guilds/${f.GUILD_ID}`;

http
	.createServer(async (req, res) => {
		const url = new URL(req.url, 'http://localhost');
		const p = url.pathname;
		if (p === '/__requests') return json(res, 200, requests);
		if (!p.startsWith('/api/') && p !== '/__emit') return handler(req, res);

		const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : null;
		requests.push({ method: req.method, path: p, body });

		if (p === '/api/users/@me') return json(res, 200, f.user);
		if (p === '/api/guilds') return json(res, 200, [f.portalGuild]);
		if (p === `/api/guilds/${f.GUILD_ID}`) return json(res, 200, f.portalGuild);
		const base = `/api/guilds/${f.GUILD_ID}/tickets`;
		if (p === base) {
			const open = url.searchParams.get('open');
			const q = (url.searchParams.get('q') ?? '').toLowerCase();
			let list = tickets.filter(
				(t) =>
					(open === null || open === '' || String(t.open) === open) &&
					(!q || (t.topic ?? '').toLowerCase().includes(q) || String(t.number) === q)
			);
			list = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
			return json(res, 200, { tickets: list, users: f.portalUsers, next: null });
		}
		const m = p.match(new RegExp(`^${base}/(\\d+)(/messages|/close|/events)?$`));
		if (m) {
			const [, id, sub] = m;
			const ticket = tickets.find((t) => t.id === id);
			if (!ticket) return json(res, 404, { error: 'Not Found', message: 'Unknown ticket' });
			if (!sub && req.method === 'GET') {
				return json(res, 200, {
					...ticket,
					questionAnswers: [{ question: { label: 'Email' }, value: 'me@example.com' }],
					feedback: null,
					users: f.portalUsers,
					permissions: { isStaff: false, canReply: ticket.open, canClose: ticket.open }
				});
			}
			if (sub === '/messages' && req.method === 'GET') {
				return json(res, 200, { messages: messages[id], next: null });
			}
			if (sub === '/messages' && req.method === 'POST') {
				if (req.headers['content-type'] !== 'application/json')
					return json(res, 415, { error: 'JSON only' });
				const { content } = JSON.parse(body);
				if (!ticket.open)
					return json(res, 409, { error: 'Conflict', message: 'This ticket is closed' });
				if (!content || content.length > 2000)
					return json(res, 400, {
						error: 'Bad Request',
						message: 'content must be 1-2000 characters'
					});
				const message = {
					id: String(BigInt('500000000000000000') + BigInt(messages[id].length)),
					author: {
						id: f.user.id,
						username: 'admin',
						displayName: 'Admin',
						avatar: null,
						bot: false,
						roleColour: null
					},
					content,
					embeds: [],
					attachments: [],
					createdAt: new Date().toISOString(),
					editedAt: null,
					deleted: false,
					viaWeb: true
				};
				messages[id].push(message);
				emit(id, 'message', message);
				return json(res, 201, message);
			}
			if (sub === '/close' && req.method === 'POST') {
				ticket.open = false;
				ticket.closedAt = new Date().toISOString();
				emit(id, 'ticket-closed', {
					id,
					closedAt: ticket.closedAt,
					reason: JSON.parse(body || '{}').reason ?? null
				});
				return json(res, 200, { ok: true });
			}
			if (sub === '/events') {
				res.writeHead(200, {
					'content-type': 'text/event-stream',
					'cache-control': 'no-cache',
					connection: 'keep-alive'
				});
				res.write(': connected\n\n');
				if (!streams.has(id)) streams.set(id, new Set());
				streams.get(id).add(res);
				req.on('close', () => streams.get(id).delete(res));
				return;
			}
		}
		if (p === '/__emit' && req.method === 'POST') {
			const { ticket, event, data } = JSON.parse(body);
			emit(ticket, event, data);
			return json(res, 200, { ok: true });
		}
		if (p === '/api/client') return json(res, 200, f.client);
		if (p === '/api/admin/guilds') return json(res, 200, [f.guild]);
		if (p === g) return json(res, 200, f.guild);
		if (p === `${g}/categories`) {
			return json(res, 200, [
				{ ...f.category(), stats: { avgResolutionTime: '1h', avgResponseTime: '5m' } }
			]);
		}
		if (p === `${g}/categories/${f.CATEGORY_ID}`) {
			return req.method === 'GET'
				? json(res, 200, f.category())
				: json(res, 200, { id: f.CATEGORY_ID });
		}
		if (p === `${g}/categories/999`) {
			// an API error whose message contains attacker-controlled HTML
			return json(res, 404, {
				error: 'Not Found',
				message: 'Unknown <img src=x onerror=alert(1)> category'
			});
		}
		if (p === `${g}/data`) {
			const query = url.searchParams.get('query');
			if (query === 'channels.cache') return json(res, 200, f.channels);
			if (query === 'roles.cache') return json(res, 200, f.roles);
			return json(res, 200, []);
		}
		if (p === `${g}/settings`) {
			return req.method === 'GET' ? json(res, 200, f.settings()) : json(res, 200, f.settings());
		}
		if (p === '/api/locales') return json(res, 200, ['en-GB', 'fr']);
		// echo the path back, like a real API error might, to test that error pages escape it
		return json(res, 404, {
			error: 'Not Found',
			message: `Unknown route ${decodeURIComponent(p)}`
		});
	})
	.listen(port, '127.0.0.1', () => console.log(`e2e server on http://127.0.0.1:${port}`));
