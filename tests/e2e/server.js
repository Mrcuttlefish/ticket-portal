// Serves the built site (build/handler.js) the way the bot does, with a mock API in front.
// Requests the mock received are exposed at GET /__requests for assertions.
import http from 'node:http';
import { handler } from '../../build/handler.js';
import * as f from './fixtures.js';

const port = Number(process.env.PORT || 5173);
const requests = [];

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
		if (!p.startsWith('/api/')) return handler(req, res);

		const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : null;
		requests.push({ method: req.method, path: p, body });

		if (p === '/api/users/@me') return json(res, 200, f.user);
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
		if (p === `${g}/settings`) return json(res, 200, { primaryColour: '#009999' });
		// echo the path back, like a real API error might, to test that error pages escape it
		return json(res, 404, {
			error: 'Not Found',
			message: `Unknown route ${decodeURIComponent(p)}`
		});
	})
	.listen(port, '127.0.0.1', () => console.log(`e2e server on http://127.0.0.1:${port}`));
