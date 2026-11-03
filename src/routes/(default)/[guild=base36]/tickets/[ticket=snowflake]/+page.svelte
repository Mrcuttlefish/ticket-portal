<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Message from '$components/portal/Message.svelte';
	import {
		MAX_MESSAGE_LENGTH,
		addAuthors,
		closeTicket,
		displayName,
		eventsUrl,
		getMessages,
		getTicket,
		sendMessage,
		upsertMessage
	} from '$lib/api/tickets';

	/** @type {{data: import('./$types').PageData}} */
	let { data } = $props();

	const guildId = data.guild.id;
	let ticket = $state(data.ticket);
	let messages = $state(data.page.messages ?? []);
	let older = $state(data.page.next ?? null);
	const refs = {
		users: addAuthors(
			{ ...(data.ticket.users ?? {}), ...(data.page.users ?? {}) },
			data.page.messages
		),
		roles: data.page.roles ?? {},
		channels: data.page.channels ?? {}
	};

	let draft = $state('');
	let sending = $state(false);
	let sendError = $state('');
	let live = $state(false);
	let closing = $state(false);
	let closeReason = $state('');
	let showClose = $state(false);
	let list = $state();

	const permissions = $derived(ticket.permissions ?? {});
	const canReply = $derived(ticket.open && permissions.canReply);
	const dateFormat = new Intl.DateTimeFormat('default', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const backHref = `/${$page.params.guild}/tickets`;

	// consecutive messages from the same author within 5 minutes are grouped, like Discord
	const grouped = (i) => {
		if (i === 0) return false;
		const a = messages[i - 1];
		const b = messages[i];
		return (
			a.author?.id === b.author?.id &&
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < 5 * 60 * 1000
		);
	};

	function scrollToEnd() {
		requestAnimationFrame(() => list?.scrollTo({ top: list.scrollHeight }));
	}

	onMount(() => {
		scrollToEnd();
		if (!ticket.open) return;
		const source = new EventSource(eventsUrl(guildId, ticket.id), { withCredentials: true });
		source.onopen = () => (live = true);
		source.onerror = () => (live = false); // EventSource reconnects by itself
		source.addEventListener('message', (e) => {
			const nearEnd = list && list.scrollHeight - list.scrollTop - list.clientHeight < 120;
			const message = JSON.parse(e.data);
			addAuthors(refs.users, [message]);
			messages = upsertMessage(messages, message);
			if (nearEnd) scrollToEnd();
		});
		source.addEventListener('message-deleted', (e) => {
			const { id } = JSON.parse(e.data);
			messages = messages.map((m) => (m.id === id ? { ...m, deleted: true } : m));
		});
		source.addEventListener('ticket-closed', async () => {
			source.close();
			ticket = { ...ticket, open: false, closedAt: ticket.closedAt ?? new Date().toISOString() };
			// pick up the close reason and who closed it
			try {
				ticket = await getTicket(fetch, guildId, ticket.id);
			} catch {
				// keep the local state
			}
			source.close();
			live = false;
		});
		return () => source.close();
	});

	async function loadOlder() {
		const before = list.scrollHeight;
		const result = await getMessages(fetch, guildId, ticket.id, older);
		messages = [...result.messages, ...messages];
		Object.assign(refs.users, result.users ?? {});
		addAuthors(refs.users, result.messages);
		older = result.next ?? null;
		requestAnimationFrame(() => list.scrollTo({ top: list.scrollHeight - before }));
	}

	async function send(event) {
		event?.preventDefault();
		const content = draft.trim();
		if (!content || sending) return;
		sending = true;
		sendError = '';
		try {
			const message = await sendMessage(fetch, guildId, ticket.id, content);
			if (message) messages = upsertMessage(messages, message);
			draft = '';
			scrollToEnd();
		} catch (err) {
			sendError = err.message;
		} finally {
			sending = false;
		}
	}

	async function close(event) {
		event.preventDefault();
		closing = true;
		try {
			await closeTicket(fetch, guildId, ticket.id, closeReason.trim());
			ticket = {
				...ticket,
				open: false,
				closedAt: new Date().toISOString(),
				closedReason: closeReason.trim() || null
			};
			showClose = false;
		} catch (err) {
			sendError = err.message;
		} finally {
			closing = false;
		}
	}
</script>

<svelte:head>
	<title>#{ticket.number} {ticket.topic ?? ''} - {data.guild.name}</title>
</svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row">
	<section
		class="flex min-w-0 grow flex-col overflow-hidden rounded-xl bg-white shadow-sm dark:bg-dgrey-900"
	>
		<header
			class="flex flex-wrap items-center gap-3 border-b border-dgrey-200 p-4 dark:border-dgrey-700"
		>
			<a
				href={backHref}
				class="text-gray-500 hover:text-blurple dark:text-gray-400"
				aria-label="Back to tickets"
			>
				<i class="fa-solid fa-arrow-left"></i>
			</a>
			<h1 class="min-w-0 grow truncate text-xl font-bold">
				<span class="text-gray-500 dark:text-gray-400">#{ticket.number}</span>
				{ticket.topic || ticket.category?.name || 'Ticket'}
			</h1>
			<span
				class="rounded-full px-3 py-0.5 text-xs font-semibold {ticket.open
					? 'bg-green-500/15 text-green-700 dark:text-green-400'
					: 'bg-dgrey-300 text-dgrey-700 dark:bg-dgrey-700 dark:text-dgrey-300'}"
				data-testid="ticket-status">{ticket.open ? 'Open' : 'Closed'}</span
			>
			{#if ticket.open}
				<span
					class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
					title="Live updates"
				>
					<span class="h-2 w-2 rounded-full {live ? 'bg-green-500' : 'bg-dgrey-400'}"></span>
					{live ? 'Live' : 'Connecting…'}
				</span>
			{/if}
		</header>

		<div
			bind:this={list}
			class="max-h-[65vh] min-h-64 overflow-y-auto pb-4"
			aria-label="Messages"
			role="log"
		>
			{#if older}
				<div class="p-2 text-center">
					<button type="button" class="text-sm text-blurple hover:underline" onclick={loadOlder}
						>Load earlier messages</button
					>
				</div>
			{/if}
			{#if messages.length === 0}
				<p class="p-8 text-center text-gray-500 dark:text-gray-400">No messages yet.</p>
			{/if}
			{#each messages as message, i (message.id)}
				<Message {message} {refs} grouped={grouped(i)} />
			{/each}
		</div>

		{#if canReply}
			<form class="border-t border-dgrey-200 p-3 dark:border-dgrey-700" onsubmit={send}>
				<label for="reply" class="sr-only">Reply</label>
				<textarea
					id="reply"
					rows="3"
					maxlength={MAX_MESSAGE_LENGTH}
					placeholder="Reply in the ticket channel… (Ctrl+Enter to send)"
					class="input form-input mt-0 w-full resize-y"
					bind:value={draft}
					onkeydown={(e) => {
						if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e);
					}}
				></textarea>
				<div class="mt-2 flex items-center gap-3">
					<span class="text-xs text-gray-500 dark:text-gray-400"
						>{draft.length}/{MAX_MESSAGE_LENGTH}</span
					>
					{#if sendError}
						<span role="alert" class="text-sm text-red-500">{sendError}</span>
					{/if}
					<button
						type="submit"
						disabled={sending || !draft.trim()}
						class="ml-auto rounded-lg bg-blurple px-5 py-2 font-medium text-white transition hover:bg-blurple/80 disabled:opacity-50"
					>
						{sending ? 'Sending…' : 'Send'}
					</button>
				</div>
			</form>
		{:else if !ticket.open}
			<p
				class="border-t border-dgrey-200 p-4 text-center text-sm text-gray-500 dark:border-dgrey-700 dark:text-gray-400"
			>
				This ticket is closed{ticket.closedAt
					? ` (${dateFormat.format(new Date(ticket.closedAt))})`
					: ''}. This is the archived transcript.
			</p>
		{/if}
	</section>

	<aside class="flex w-full shrink-0 flex-col gap-4 lg:w-72">
		<div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900">
			<h2 class="mb-2 font-semibold">Details</h2>
			<dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
				<dt class="text-gray-500 dark:text-gray-400">Category</dt>
				<dd>{ticket.category?.emoji ?? ''} {ticket.category?.name ?? 'Deleted'}</dd>
				<dt class="text-gray-500 dark:text-gray-400">Opened by</dt>
				<dd>{displayName(refs.users[ticket.createdById])}</dd>
				{#if ticket.claimedById}
					<dt class="text-gray-500 dark:text-gray-400">Claimed by</dt>
					<dd>{displayName(refs.users[ticket.claimedById])}</dd>
				{/if}
				<dt class="text-gray-500 dark:text-gray-400">Opened</dt>
				<dd>{dateFormat.format(new Date(ticket.createdAt))}</dd>
				{#if ticket.closedAt}
					<dt class="text-gray-500 dark:text-gray-400">Closed</dt>
					<dd>{dateFormat.format(new Date(ticket.closedAt))}</dd>
				{/if}
				{#if ticket.closedById}
					<dt class="text-gray-500 dark:text-gray-400">Closed by</dt>
					<dd>{displayName(refs.users[ticket.closedById])}</dd>
				{/if}
				{#if ticket.closedReason}
					<dt class="text-gray-500 dark:text-gray-400">Reason</dt>
					<dd class="whitespace-pre-wrap break-words">{ticket.closedReason}</dd>
				{/if}
			</dl>
		</div>
		{#if ticket.questionAnswers?.length}
			<div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900">
				<h2 class="mb-2 font-semibold">Answers</h2>
				<dl class="flex flex-col gap-2">
					{#each ticket.questionAnswers as answer}
						<div>
							<dt class="text-gray-500 dark:text-gray-400">
								{answer.label ?? answer.question?.label}
							</dt>
							<dd class="whitespace-pre-wrap break-words">{answer.value || '—'}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/if}
		{#if ticket.feedback}
			<div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900">
				<h2 class="mb-2 font-semibold">Feedback</h2>
				<p aria-label="Rating {ticket.feedback.rating} out of 5">
					{'★'.repeat(ticket.feedback.rating)}{'☆'.repeat(5 - ticket.feedback.rating)}
				</p>
				{#if ticket.feedback.comment}<p class="mt-1 whitespace-pre-wrap">
						{ticket.feedback.comment}
					</p>{/if}
			</div>
		{/if}
		{#if ticket.open && permissions.canClose}
			<div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900">
				{#if showClose}
					<form onsubmit={close} class="flex flex-col gap-2">
						<label for="close-reason" class="font-semibold">Close this ticket?</label>
						<input
							id="close-reason"
							type="text"
							maxlength="200"
							placeholder="Reason (optional)"
							class="input form-input mt-0"
							bind:value={closeReason}
						/>
						<div class="flex gap-2">
							<button
								type="submit"
								disabled={closing}
								class="rounded-lg bg-red-500 px-4 py-1.5 font-medium text-white hover:bg-red-600 disabled:opacity-50"
								>{closing ? 'Closing…' : 'Close ticket'}</button
							>
							<button
								type="button"
								class="rounded-lg px-4 py-1.5"
								onclick={() => (showClose = false)}>Cancel</button
							>
						</div>
					</form>
				{:else}
					<button
						type="button"
						class="w-full rounded-lg border border-red-500 px-4 py-1.5 font-medium text-red-500 hover:bg-red-500 hover:text-white"
						onclick={() => (showClose = true)}>Close ticket…</button
					>
				{/if}
			</div>
		{/if}
	</aside>
</div>
