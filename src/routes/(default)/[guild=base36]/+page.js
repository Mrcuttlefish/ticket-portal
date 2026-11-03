import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	redirect(307, `/${params.guild}/tickets`);
}
