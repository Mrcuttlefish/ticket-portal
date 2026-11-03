import { error } from '@sveltejs/kit';
import { ApiError, getMessages, getTicket } from '$lib/api/tickets';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, parent, params }) {
	const { guild } = await parent();
	try {
		const [ticket, page] = await Promise.all([
			getTicket(fetch, guild.id, params.ticket),
			getMessages(fetch, guild.id, params.ticket)
		]);
		return { ticket, page };
	} catch (err) {
		if (err instanceof ApiError) error(err.status, err.message);
		throw err;
	}
}
