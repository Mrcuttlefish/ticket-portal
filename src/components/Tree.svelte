<script>
	import Tree from './Tree.svelte';

	/** @type {{entry?: any, indent?: number}} */
	let { entry = [], indent = 0 } = $props();
</script>

<div>
	{#if entry instanceof Array}
		{#each entry as child}
			<div class:my-4={indent > 0} class="font-mono" style="padding-left: {indent}px;">
				<!-- pt-2 (stalk) -->
				<div
					class="rounded-bl-xl border-l-2 border-dotted border-black/25 pl-2 dark:border-white/25"
				>
					<p class="font-bold text-red-700 dark:text-red-500">{child[0]}</p>
					<Tree entry={child[1]} indent={indent + 6} />
				</div>
			</div>
		{/each}
	{:else}
		<!-- text-xs -->
		<!-- rendered as text: entries can contain URL parameters and API error messages -->
		<p class="ml-2 whitespace-pre-wrap break-words text-sm text-black/75 dark:text-white/75">
			{entry}
		</p>
	{/if}
</div>
