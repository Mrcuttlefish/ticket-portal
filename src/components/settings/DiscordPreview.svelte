<script>
	/**
	 * Shows a message model from $lib/util/preview.js the way Discord shows it: classic embeds, the new layout
	 * (Components V2), buttons and select menus. Everything admins or members typed goes through renderMarkdown, which
	 * escapes HTML; mentions are rendered here from escaped names, and images must be http(s) URLs.
	 */
	import { escapeHTML, renderMarkdown, safeHref } from '$lib/util/markdown';
	import { cssColour, resolveEmoji } from '$lib/util/preview';

	/** @type {{ message: import('$lib/util/preview').PreviewModel, label?: string }} */
	let { message, label = 'Message preview' } = $props();

	const time = new Date().toLocaleTimeString('default', { hour: 'numeric', minute: 'numeric' });

	const mentionHTML = (m) => {
		const colour =
			m.kind === 'role' && m.color && m.color !== '#000000' ? cssColour(m.color, '') : '';
		const style = colour ? ` style="color:${colour};background-color:${colour}26"` : '';
		return `<span class="discord-mention"${style}>@${escapeHTML(m.name)}</span>`;
	};

	// Discord keeps single line breaks, markdown doesn't
	/** @param {string | null | undefined} text */
	const md = (text) =>
		renderMarkdown(
			String(text ?? '').replace(/\n/g, '  \n'),
			message.mentions.map((m) => [new RegExp(m.token, 'g'), mentionHTML(m), { html: true }])
		);

	/** @param {string | null | undefined} url */
	const image = (url) => {
		const safe = safeHref(url ?? '');
		return safe && !safe.startsWith('mailto:') ? safe : null;
	};

	const BUTTON_STYLES = {
		danger: 'bg-[#da373c] text-white',
		primary: 'bg-[#5865f2] text-white',
		secondary: 'bg-[#e3e5e8] text-[#313338] dark:bg-[#4e5058] dark:text-white',
		success: 'bg-[#248046] text-white'
	};
</script>

{#snippet emoji(value)}
	{@const e = resolveEmoji(value)}
	{#if e?.url}
		<img src={e.url} alt="" class="h-[18px] w-[18px]" />
	{:else if e?.text}
		<span aria-hidden="true">{e.text}</span>
	{/if}
{/snippet}

{#snippet row(r)}
	{#if r.type === 'buttons'}
		<div class="mt-1 flex flex-wrap gap-2" data-preview="buttons">
			{#each r.buttons as b}
				<span
					class="inline-flex h-8 items-center gap-1.5 rounded-[3px] px-4 text-sm font-medium {BUTTON_STYLES[
						b.style
					] ?? BUTTON_STYLES.secondary}"
				>
					{@render emoji(b.emoji)}
					<span>{b.label}</span>
				</span>
			{/each}
		</div>
	{:else if r.type === 'menu'}
		<details class="group mt-1 max-w-[400px]" data-preview="menu">
			<summary
				class="flex h-10 cursor-pointer list-none items-center justify-between rounded border border-[#e3e5e8] bg-[#ebedef] px-3 text-sm text-[#5c5e66] dark:border-[#1e1f22] dark:bg-[#1e1f22] dark:text-[#949ba4]"
			>
				<span>{r.placeholder}</span>
				<span class="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
			</summary>
			<ul
				class="mt-1 rounded border border-[#e3e5e8] bg-white text-sm dark:border-[#1e1f22] dark:bg-[#2b2d31]"
			>
				{#each r.options as o}
					<li class="flex items-center gap-2 px-3 py-2">
						{@render emoji(o.emoji)}
						<span>
							<span class="block font-medium">{o.label}</span>
							{#if o.description}
								<span class="block text-xs text-[#5c5e66] dark:text-[#b5bac1]">{o.description}</span
								>
							{/if}
						</span>
					</li>
				{:else}
					<li class="px-3 py-2 text-[#5c5e66] dark:text-[#b5bac1]">No categories</li>
				{/each}
			</ul>
		</details>
	{/if}
{/snippet}

{#snippet footer(f)}
	<div class="mt-2 flex items-center gap-2 text-xs text-[#5c5e66] dark:text-[#b5bac1]">
		{#if image(f.icon)}
			<img src={image(f.icon)} alt="" class="h-5 w-5 rounded-full" />
		{/if}
		<span>{f.text}</span>
	</div>
{/snippet}

<div
	class="discord-preview rounded-lg bg-white px-4 py-3 text-[15px] leading-[1.375rem] text-[#313338] dark:bg-[#313338] dark:text-[#dbdee1]"
	role="figure"
	aria-label={label}
	data-preview-layout={message.container ? 'v2' : message.embeds.length ? 'embed' : 'text'}
>
	<div class="flex gap-4">
		{#if image(message.author.avatar)}
			<img src={image(message.author.avatar)} alt="" class="h-10 w-10 shrink-0 rounded-full" />
		{:else}
			<div class="h-10 w-10 shrink-0 rounded-full bg-[#5865f2]"></div>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-1">
				<span class="font-medium text-[#060607] dark:text-white">{message.author.name}</span>
				<span
					class="rounded bg-[#5865f2] px-1 text-[10px] font-semibold uppercase leading-4 text-white"
					>App</span
				>
				<span class="ml-1 text-xs text-[#5c5e66] dark:text-[#949ba4]">Today at {time}</span>
			</div>

			{#if message.content}
				<div class="discord-markdown break-words" data-preview="content">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
					{@html md(message.content)}
				</div>
			{/if}

			{#each message.embeds as e}
				<div
					class="mt-1 flex max-w-[520px] overflow-hidden rounded bg-[#f2f3f5] dark:bg-[#2b2d31]"
					data-preview="embed"
				>
					<div class="w-1 shrink-0" style:background-color={cssColour(e.color)}></div>
					<div class="flex min-w-0 flex-1 gap-4 px-3 pb-3 pt-2">
						<div class="min-w-0 flex-1">
							{#if e.author}
								<div class="mt-1 flex items-center gap-2 text-sm font-medium">
									{#if image(e.author.icon)}
										<img src={image(e.author.icon)} alt="" class="h-6 w-6 rounded-full" />
									{/if}
									<span>{e.author.name}</span>
								</div>
							{/if}
							{#if e.title}
								<div class="discord-markdown mt-1 font-semibold">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
									{@html md(e.title)}
								</div>
							{/if}
							{#if e.description}
								<div class="discord-markdown mt-1 break-words text-sm">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
									{@html md(e.description)}
								</div>
							{/if}
							{#if e.fields?.length}
								<div class="mt-2 grid gap-2">
									{#each e.fields as field}
										<div class="text-sm">
											<div class="font-semibold">{field.name}</div>
											<div class="discord-markdown break-words">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
												{@html md(field.value)}
											</div>
										</div>
									{/each}
								</div>
							{/if}
							{#if image(e.image)}
								<img src={image(e.image)} alt="" class="mt-3 max-h-80 max-w-full rounded" />
							{/if}
							{#if e.footer}
								{@render footer(e.footer)}
							{/if}
						</div>
						{#if image(e.thumbnail)}
							<img
								src={image(e.thumbnail)}
								alt=""
								class="mt-2 h-20 w-20 shrink-0 rounded object-cover"
							/>
						{/if}
					</div>
				</div>
			{/each}

			{#if message.container}
				<div
					class="mt-1 flex max-w-[600px] overflow-hidden rounded-lg border border-[#e3e5e8] bg-[#f2f3f5] dark:border-[#3f4147] dark:bg-[#2b2d31]"
					data-preview="container"
				>
					<div
						class="w-1 shrink-0"
						style:background-color={cssColour(message.container.accent)}
					></div>
					<div class="flex min-w-0 flex-1 flex-col gap-2 p-4">
						{#each message.container.children as c}
							{#if c.type === 'text'}
								<div class="flex gap-4">
									<div class="discord-markdown min-w-0 flex-1 break-words">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
										{@html md(c.markdown)}
									</div>
									{#if image(c.thumbnail)}
										<img
											src={image(c.thumbnail)}
											alt=""
											class="h-20 w-20 shrink-0 rounded-lg object-cover"
										/>
									{/if}
								</div>
							{:else if c.type === 'gallery'}
								{#if image(c.url)}
									<img src={image(c.url)} alt="" class="max-h-80 w-full rounded-lg object-cover" />
								{/if}
							{:else if c.type === 'separator'}
								<hr class="border-[#e3e5e8] dark:border-[#3f4147]" />
							{:else if c.type === 'subtext'}
								<div class="discord-markdown text-xs text-[#5c5e66] dark:text-[#949ba4]">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
									{@html md(c.text)}
								</div>
							{:else}
								{@render row(c)}
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			{#each message.rows as r}
				{@render row(r)}
			{/each}
		</div>
	</div>
</div>

<style>
	.discord-preview :global(.discord-mention) {
		border-radius: 3px;
		padding: 0 2px;
		font-weight: 500;
		color: #505cdc;
		background-color: rgb(88 101 242 / 0.15);
	}
	:global(.dark) .discord-preview :global(.discord-mention:not([style])) {
		color: #c9cdfb;
		background-color: rgb(88 101 242 / 0.3);
	}
	.discord-markdown :global(p) {
		margin: 0;
	}
	.discord-markdown :global(h1) {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.375;
		margin: 0.25rem 0;
	}
	.discord-markdown :global(h2) {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.375;
		margin: 0.25rem 0;
	}
	.discord-markdown :global(h3) {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.375;
		margin: 0.25rem 0;
	}
	.discord-markdown :global(a) {
		color: #006ce7;
	}
	:global(.dark) .discord-markdown :global(a) {
		color: #00a8fc;
	}
	.discord-markdown :global(code) {
		border-radius: 3px;
		padding: 0 0.2em;
		background: rgb(0 0 0 / 0.08);
		font-size: 0.875em;
	}
	.discord-markdown :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.discord-markdown :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}
	.discord-markdown :global(blockquote) {
		border-left: 4px solid #4e5058;
		padding-left: 0.75rem;
	}
	.discord-markdown :global(img) {
		max-width: 100%;
	}
</style>
