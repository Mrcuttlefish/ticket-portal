import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, url }) {
	const query = new URLSearchParams();
	const type = url.searchParams.get('type');
	const before = url.searchParams.get('before');
	if (type) query.set('type', type);
	if (before && /^\d+$/.test(before)) query.set('before', before);
	const response = await fetch(`/api/admin/guilds/${params.guild}/history?${query}`, {
		credentials: 'include'
	});
	const isJSON = response.headers.get('Content-Type')?.includes('json');
	const body = isJSON ? await response.json() : await response.text();
	if (!response.ok) error(response.status, isJSON ? JSON.stringify(body) : body);
	return { history: body, type: type ?? '' };
}
