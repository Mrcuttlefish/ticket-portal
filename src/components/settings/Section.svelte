<script>
	/** A titled group of settings. */
	/** @type {{ title: string, description?: string, icon?: string, id?: string, children?: import('svelte').Snippet }} */
	let { title, description = '', icon = '', id, children } = $props();
</script>

<section
	{id}
	class="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-700"
	aria-labelledby="{id}-title"
>
	<header class="mb-4">
		<h2 id="{id}-title" class="text-xl font-bold">
			{#if icon}<i class="{icon} mr-1 text-blurple"></i>{/if}
			{title}
		</h2>
		{#if description}
			<p class="text-sm text-gray-500 dark:text-slate-400">{description}</p>
		{/if}
	</header>
	<div class="flex flex-col gap-6">
		{@render children?.()}
	</div>
</section>
