<script>
	import { renderMarkdown, safeHref } from '$lib/util/markdown';
	import { displayName, formatBytes, resolveMentions } from '$lib/api/tickets';

	/** @type {{ message: any, refs?: any, grouped?: boolean }} */
	let { message, refs = {}, grouped = false } = $props();

	const time = new Intl.DateTimeFormat('default', { timeStyle: 'short' });
	const full = new Intl.DateTimeFormat('default', { dateStyle: 'full', timeStyle: 'long' });
	const short = new Intl.DateTimeFormat('default', { dateStyle: 'medium', timeStyle: 'short' });

	const avatar = $derived(
		message.author?.avatar && safeHref(message.author.avatar)
			? message.author.avatar
			: 'https://cdn.discordapp.com/embed/avatars/0.png'
	);
	const html = $derived(
		renderMarkdown(resolveMentions(message.content, refs).replace(/\n/g, '  \n'))
	);
	const isImage = (a) => /^image\//.test(a.contentType ?? '') && !a.expired && safeHref(a.url);
</script>

<article
	class="group flex gap-3 px-4 {grouped
		? 'py-0.5'
		: 'mt-3 py-1'} hover:bg-dgrey-200/40 dark:hover:bg-dgrey-950/30"
	class:opacity-60={message.deleted}
	aria-label="Message from {displayName(message.author)}"
	data-message-id={message.id}
>
	<div class="w-10 shrink-0">
		{#if !grouped}
			<img src={avatar} alt="" class="h-10 w-10 rounded-full" loading="lazy" />
		{:else}
			<time
				datetime={message.createdAt}
				class="invisible block pt-1 text-right text-[10px] text-gray-500 group-hover:visible dark:text-gray-400"
				>{time.format(new Date(message.createdAt))}</time
			>
		{/if}
	</div>
	<div class="min-w-0 grow">
		{#if !grouped}
			<p class="flex flex-wrap items-baseline gap-x-2">
				<span
					class="font-semibold"
					style={message.author?.roleColour ? `color: ${message.author.roleColour}` : ''}
					>{displayName(message.author)}</span
				>
				{#if message.author?.bot}
					<span class="rounded bg-blurple px-1 text-[10px] font-bold uppercase text-white">Bot</span
					>
				{/if}
				{#if message.viaWeb}
					<span
						class="rounded bg-dgrey-300 px-1 text-[10px] font-semibold uppercase dark:bg-dgrey-700"
						>Web</span
					>
				{/if}
				<time
					datetime={message.createdAt}
					title={full.format(new Date(message.createdAt))}
					class="text-xs text-gray-500 dark:text-gray-400"
					>{short.format(new Date(message.createdAt))}</time
				>
			</p>
		{/if}
		{#if message.content}
			<div class="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-0">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
				{@html html}
			</div>
		{/if}
		{#if message.editedAt}
			<span
				class="text-[10px] text-gray-500 dark:text-gray-400"
				title={full.format(new Date(message.editedAt))}>(edited)</span
			>
		{/if}
		{#if message.deleted}
			<span class="text-[10px] font-semibold text-red-500">(deleted)</span>
		{/if}
		{#each message.embeds ?? [] as embed}
			<div
				class="mt-1 max-w-lg rounded border-l-4 bg-dgrey-200/60 p-3 dark:bg-dgrey-950/50"
				style="border-color: {embed.color
					? `#${Number(embed.color).toString(16).padStart(6, '0')}`
					: '#5865f2'}"
			>
				{#if embed.title}<p class="font-semibold">{embed.title}</p>{/if}
				{#if embed.description}
					<div class="prose prose-sm dark:prose-invert">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
						{@html renderMarkdown(resolveMentions(embed.description, refs))}
					</div>
				{/if}
				{#each embed.fields ?? [] as field}
					<p class="mt-2 text-sm font-semibold">{field.name}</p>
					<div class="prose prose-sm dark:prose-invert">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
						{@html renderMarkdown(resolveMentions(field.value, refs))}
					</div>
				{/each}
			</div>
		{/each}
		{#if message.attachments?.length}
			<div class="mt-1 flex flex-wrap gap-2">
				{#each message.attachments as a}
					{#if isImage(a)}
						<a href={safeHref(a.url)} target="_blank" rel="noopener noreferrer">
							<img
								src={safeHref(a.url)}
								alt={a.name}
								class="max-h-64 max-w-xs rounded"
								loading="lazy"
							/>
						</a>
					{:else}
						<div
							class="flex items-center gap-2 rounded border border-dgrey-300 bg-white px-3 py-2 text-sm dark:border-dgrey-700 dark:bg-dgrey-900"
						>
							<i class="fa-solid fa-file text-gray-500 dark:text-gray-400"></i>
							{#if a.expired || !safeHref(a.url)}
								<span>{a.name}</span>
								<span class="text-xs text-gray-500 dark:text-gray-400">(link expired)</span>
							{:else}
								<a
									href={safeHref(a.url)}
									target="_blank"
									rel="noopener noreferrer"
									class="text-blurple hover:underline">{a.name}</a
								>
							{/if}
							<span class="text-xs text-gray-500 dark:text-gray-400">{formatBytes(a.size)}</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</article>
