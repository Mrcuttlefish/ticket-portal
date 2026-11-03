<script>
	import { page } from '$app/stores';
	import { downloadExport } from '$lib/util/export';

	/** A button that downloads the server export and shows why if it's refused. */
	/** @type {{ class?: string, children?: import('svelte').Snippet }} */
	let { class: className = '', children } = $props();

	let loading = $state(false);
	let error = $state('');

	async function run() {
		loading = true;
		error = '';
		try {
			await downloadExport(fetch, $page.params.guild);
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<button type="button" class="w-full {className}" disabled={loading} onclick={run}>
	{@render children?.()}
</button>
{#if error}
	<p role="alert" class="mt-1 text-center text-sm font-medium text-red-500">{error}</p>
{/if}
