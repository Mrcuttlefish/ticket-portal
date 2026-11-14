<script>
	/** @type {{ data: any }} */
	let { data } = $props();

	const types = [
		['', 'Everything'],
		['settings', 'General settings'],
		['category', 'Categories'],
		['question', 'Questions'],
		['panel', 'Panels'],
		['tag', 'Tags']
	];
	const verbs = { create: 'created', delete: 'deleted', update: 'changed' };
	const typeNames = {
		category: 'category',
		panel: 'panel',
		question: 'question',
		settings: 'the settings',
		tag: 'tag'
	};
	const when = (date) =>
		new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	const nextHref = $derived(
		`?${new URLSearchParams({ ...(data.type && { type: data.type }), before: String(data.history.next) })}`
	);
</script>

<svelte:head>
	<title>History - {data.guild?.name ?? 'Discord Tickets'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 pb-12">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-3xl font-bold">History</h1>
			<p class="text-gray-500 dark:text-slate-400">
				Changes made in the dashboard, newest first. Kept for a year.
			</p>
		</div>
		<form method="GET" class="flex items-center gap-2">
			<label class="text-sm font-medium">
				Show
				<select
					name="type"
					class="input form-multiselect mt-0 inline-block w-auto"
					value={data.type}
					onchange={(event) => event.currentTarget.form.requestSubmit()}
				>
					{#each types as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
			<noscript><button type="submit" class="text-blurple">Filter</button></noscript>
		</form>
	</div>

	{#if data.history.entries.length === 0}
		<p
			class="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm dark:bg-slate-800 dark:text-slate-400"
		>
			No changes yet.
		</p>
	{:else}
		<ol class="flex flex-col gap-3">
			{#each data.history.entries as entry (entry.id)}
				<li class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
					<div class="flex flex-wrap items-center gap-2">
						{#if entry.user?.avatar}<img
								src={entry.user.avatar}
								alt=""
								class="h-6 w-6 rounded-full"
							/>{/if}
						<span class="font-semibold"
							>{entry.user?.displayName ?? entry.user?.username ?? entry.user?.id}</span
						>
						<span>
							{verbs[entry.action] ?? entry.action}
							{typeNames[entry.target.type] ?? entry.target.type}
							{#if entry.target.type !== 'settings' && entry.target.name}
								<span class="font-medium">{entry.target.name}</span>
							{/if}
						</span>
						<time
							class="ml-auto text-sm text-gray-500 dark:text-slate-400"
							datetime={entry.createdAt}>{when(entry.createdAt)}</time
						>
					</div>
					{#if entry.changes.length > 0}
						<details class="mt-2">
							<summary class="cursor-pointer text-sm text-gray-500 dark:text-slate-400">
								{entry.changes.length} change{entry.changes.length === 1 ? '' : 's'}
							</summary>
							<table class="mt-2 w-full table-fixed text-left text-sm">
								<thead class="text-gray-500 dark:text-slate-400">
									<tr><th class="w-1/4">Setting</th><th>Before</th><th>After</th></tr>
								</thead>
								<tbody class="font-mono">
									{#each entry.changes as change (change.field)}
										<tr class="border-t border-gray-100 align-top dark:border-slate-700">
											<td class="break-words py-1 font-sans font-medium">{change.field}</td>
											<td class="break-words py-1 text-red-700 dark:text-red-300"
												>{change.from ?? '-'}</td
											>
											<td class="break-words py-1 text-green-700 dark:text-green-300"
												>{change.to ?? '-'}</td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						</details>
					{/if}
				</li>
			{/each}
		</ol>
		{#if data.history.next}
			<div class="mt-4 text-center">
				<a href={nextHref} class="font-medium text-blurple hover:underline">Older changes</a>
			</div>
		{/if}
	{/if}
</div>
