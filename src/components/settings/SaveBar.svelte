<script>
	/** Sticky save bar for settings forms. */
	/** @type {{ modified: boolean, loading: boolean, saved?: boolean, label?: string }} */
	let { modified, loading, saved = false, label = 'Save changes' } = $props();
</script>

<div
	class="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-200/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
>
	<p class="text-sm" role="status" aria-live="polite">
		{#if loading}
			Saving…
		{:else if modified}
			<span class="text-orange-600 dark:text-orange-400">You have unsaved changes</span>
		{:else if saved}
			<span class="text-green-600 dark:text-green-400"><i class="fa-solid fa-check"></i> Saved</span
			>
		{/if}
	</p>
	<button
		type="submit"
		disabled={loading}
		class="rounded-lg bg-green-500 px-5 py-2 font-medium text-white transition duration-300 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{#if loading}
			<i class="fa-solid fa-spinner animate-spin"></i>
		{/if}
		{label}
	</button>
</div>
