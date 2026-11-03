import { error } from '@sveltejs/kit';
import { ApiError, listTickets } from '$lib/api/tickets';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, parent, url }) {
	const { guild } = await parent();
	const status = url.searchParams.get('status') ?? 'open';
	const q = url.searchParams.get('q') ?? '';
	const filters = { q, open: status === 'all' ? null : status === 'open' };
	try {
		const result = await listTickets(fetch, guild.id, filters);
		return { status, q, result };
	} catch (err) {
		if (err instanceof ApiError) error(err.status, err.message);
		throw err;
	}
}
