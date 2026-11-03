<script>
	/** Helper text shown under a setting. */
	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();
</script>

<p class="mt-1 text-sm font-normal text-gray-500 dark:text-slate-400">{@render children?.()}</p>
