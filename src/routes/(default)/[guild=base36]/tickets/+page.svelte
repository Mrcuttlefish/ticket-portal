<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { displayName, listTickets } from '$lib/api/tickets';

	/** @type {{data: import('./$types').PageData}} */
	let { data } = $props();

	let tickets = $state(data.result.tickets);
	let users = $state(data.result.users ?? {});
	let next = $state(data.result.next);
	let loadingMore = $state(false);
	let q = $state(data.q);

	$effect(() => {
		tickets = data.result.tickets;
		users = data.result.users ?? {};
		next = data.result.next;
	});

	const statuses = [
		{ value: 'open', label: 'Open' },
		{ value: 'closed', label: 'Closed' },
		{ value: 'all', label: 'All' }
	];

	const isStaff = data.guild.privilegeLevel >= 1;
	const dateFormat = new Intl.DateTimeFormat('default', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	function filterUrl(changes) {
		const params = new URLSearchParams($page.url.searchParams);
		for (const [k, v] of Object.entries(changes)) {
			if (v) params.set(k, v);
			else params.delete(k);
		}
		const qs = params.toString();
		return `${$page.url.pathname}${qs ? `?${qs}` : ''}`;
	}

	function search(event) {
		event.preventDefault();
		goto(filterUrl({ q: q.trim() }), { keepFocus: true });
	}

	async function loadMore() {
		loadingMore = true;
		try {
			const result = await listTickets(fetch, data.guild.id, {
				q: data.q,
				open: data.status === 'all' ? null : data.status === 'open',
				cursor: next
			});
			tickets = [...tickets, ...result.tickets];
			users = { ...users, ...result.users };
			next = result.next;
		} finally {
			loadingMore = false;
		}
	}
</script>

<svelte:head>
	<title>Tickets - {data.guild.name}</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">{isStaff ? 'Tickets' : 'Your tickets'}</h1>
			<p class="text-gray-500 dark:text-gray-400">
				{isStaff
					? 'Read transcripts and reply to open tickets.'
					: 'Read your past tickets and reply to open ones.'}
			</p>
		</div>
		<form role="search" class="flex gap-2" onsubmit={search}>
			<input
				type="search"
				class="input form-input mt-0 w-56"
				placeholder="Search topic or number"
				aria-label="Search tickets"
				bind:value={q}
			/>
			<button
				type="submit"
				class="rounded-lg bg-blurple px-4 font-medium text-white hover:bg-blurple/80"
			>
				Search
			</button>
		</form>
	</div>

	<div class="flex gap-2" role="tablist" aria-label="Ticket status">
		{#each statuses as s}
			<a
				role="tab"
				aria-selected={data.status === s.value}
				href={filterUrl({ status: s.value === 'open' ? '' : s.value })}
				class="rounded-full px-4 py-1 text-sm font-medium transition {data.status === s.value
					? 'bg-blurple text-white'
					: 'bg-dgrey-200 hover:bg-dgrey-300 dark:bg-dgrey-900 dark:hover:bg-dgrey-700'}"
			>
				{s.label}
			</a>
		{/each}
	</div>

	{#if tickets.length === 0}
		<div class="rounded-xl bg-white p-8 text-center shadow-sm dark:bg-dgrey-900">
			<i class="fa-regular fa-folder-open mb-2 text-4xl text-dgrey-400"></i>
			<p>
				No {data.status === 'all' ? '' : data.status} tickets{data.q
					? ` matching "${data.q}"`
					: ''}.
			</p>
		</div>
	{:else}
		<ul class="flex flex-col gap-2" aria-label="Tickets">
			{#each tickets as ticket (ticket.id)}
				<li>
					<a
						href={`${$page.url.pathname}/${ticket.id}`}
						class="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition hover:ring-2 hover:ring-blurple/50 dark:bg-dgrey-900"
					>
						<span class="text-2xl" aria-hidden="true">{ticket.category?.emoji || '🎫'}</span>
						<div class="min-w-0 grow">
							<p class="truncate font-semibold">
								<span class="text-gray-500 dark:text-gray-400">#{ticket.number}</span>
								{ticket.topic || ticket.category?.name || 'Ticket'}
							</p>
							<p class="truncate text-sm text-gray-500 dark:text-gray-400">
								{ticket.category?.name ?? 'Deleted category'}
								{#if isStaff}
									· {displayName(users[ticket.createdById])}
								{/if}
								· {dateFormat.format(new Date(ticket.createdAt))}
								{#if ticket.messageCount}
									· {ticket.messageCount} message{ticket.messageCount === 1 ? '' : 's'}
								{/if}
							</p>
						</div>
						<span
							class="shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold {ticket.open
								? 'bg-green-500/15 text-green-700 dark:text-green-400'
								: 'bg-dgrey-300 text-dgrey-700 dark:bg-dgrey-700 dark:text-dgrey-300'}"
						>
							{ticket.open ? 'Open' : 'Closed'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
		{#if next}
			<button
				type="button"
				class="self-center rounded-lg px-4 py-2 font-medium text-blurple hover:bg-blurple/10"
				disabled={loadingMore}
				onclick={loadMore}
			>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		{/if}
	{/if}
</div>
