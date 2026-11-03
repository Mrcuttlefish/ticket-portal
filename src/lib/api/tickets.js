/**
 * Client for the bot's ticket archive API (`/api/guilds/:guild/tickets`).
 * Every function takes SvelteKit's `fetch` so it works in `load` and in the browser.
 */

export class ApiError extends Error {
	/** @param {number} status @param {any} body */
	constructor(status, body) {
		super(body?.message || body?.error || `Request failed (${status})`);
		this.status = status;
		this.body = body;
	}
}

async function request(fetch, url, options = {}) {
	const response = await fetch(url, { credentials: 'include', ...options });
	const isJSON = response.headers.get('content-type')?.includes('json');
	const body = isJSON ? await response.json() : await response.text();
	if (!response.ok) throw new ApiError(response.status, isJSON ? body : { message: body });
	return body;
}

const base = (guildId) => `/api/guilds/${guildId}/tickets`;

/**
 * @param {typeof fetch} fetch
 * @param {string} guildId
 * @param {{ open?: boolean | null, category?: string, creator?: string, q?: string, cursor?: string, limit?: number }} [filters]
 */
export function listTickets(fetch, guildId, filters = {}) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
	}
	const qs = params.toString();
	return request(fetch, `${base(guildId)}${qs ? `?${qs}` : ''}`);
}

export const getTicket = (fetch, guildId, ticketId) =>
	request(fetch, `${base(guildId)}/${ticketId}`);

export function getMessages(fetch, guildId, ticketId, cursor) {
	const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
	return request(fetch, `${base(guildId)}/${ticketId}/messages${qs}`);
}

export const sendMessage = (fetch, guildId, ticketId, content) =>
	request(fetch, `${base(guildId)}/${ticketId}/messages`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content })
	});

export const closeTicket = (fetch, guildId, ticketId, reason) =>
	request(fetch, `${base(guildId)}/${ticketId}/close`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ reason: reason || null })
	});

export const eventsUrl = (guildId, ticketId) => `${base(guildId)}/${ticketId}/events`;

export const MAX_MESSAGE_LENGTH = 2000;

/** Guild IDs appear in portal URLs in base 36. */
export const toSlug = (id) => BigInt(id).toString(36);
export function fromSlug(slug) {
	let n = 0n;
	for (const c of slug.toLowerCase()) n = n * 36n + BigInt(parseInt(c, 36));
	return n.toString();
}

/**
 * Replace Discord mention syntax with readable text before markdown rendering.
 * @param {string} content
 * @param {{ users?: Record<string, any>, roles?: Record<string, any>, channels?: Record<string, any> }} [refs]
 */
export function resolveMentions(content, { users = {}, roles = {}, channels = {} } = {}) {
	return String(content ?? '')
		.replace(
			/<@!?(\d{17,20})>/g,
			(_, id) => `@${users[id]?.displayName || users[id]?.username || 'unknown-user'}`
		)
		.replace(/<@&(\d{17,20})>/g, (_, id) => `@${roles[id]?.name || 'unknown-role'}`)
		.replace(/<#(\d{17,20})>/g, (_, id) => `#${channels[id]?.name || 'unknown-channel'}`)
		.replace(/<a?:(\w{2,32}):\d{17,20}>/g, ':$1:')
		.replace(/<t:(\d{1,13})(?::[tTdDfFR])?>/g, (_, s) =>
			new Date(Number(s) * 1000).toLocaleString()
		);
}

/** @param {number} bytes */
export function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	const units = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let n = bytes;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i++;
	}
	return `${i === 0 ? n : n.toFixed(1)} ${units[i]}`;
}

/**
 * Merge an incoming message into a list (dedupe by id; keep chronological order).
 * @param {any[]} list
 * @param {any} message
 */
export function upsertMessage(list, message) {
	const i = list.findIndex((m) => m.id === message.id);
	if (i !== -1) {
		const copy = [...list];
		copy[i] = { ...copy[i], ...message };
		return copy;
	}
	const next = [...list, message];
	next.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
	return next;
}

/** Name to show for a user record or message author. */
export const displayName = (u) => u?.displayName || u?.username || 'Unknown user';
