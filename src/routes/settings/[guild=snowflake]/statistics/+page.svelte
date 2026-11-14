<script>
	/** @type {{ data: any }} */
	let { data } = $props();

	const ranges = [7, 30, 90, 365];
	const stats = $derived(data.statistics);
	const days = $derived(stats.days ?? []);
	const max = $derived(Math.max(1, ...days.map((d) => Math.max(d.created, d.closed))));
	let hovered = $state(null);

	// the chart: created and closed per day, as pairs of bars on one axis
	const width = 720;
	const height = 220;
	const pad = { top: 12, right: 8, bottom: 24, left: 32 };
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;
	const slot = $derived(plotW / Math.max(1, days.length));
	const barW = $derived(Math.max(1, Math.min(14, (slot - 4) / 2)));
	const y = (value) => pad.top + plotH - (value / max) * plotH;
	const ticks = $derived([0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i));
	const label = (date) =>
		new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	const every = $derived(Math.ceil(days.length / 8));
	// a bar with rounded data-end, anchored to the baseline
	const bar = (x, value) => {
		const top = y(value);
		const h = pad.top + plotH - top;
		if (h <= 0) return '';
		const r = Math.min(4, barW / 2, h);
		return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${top + h}Z`;
	};
	const tiles = $derived([
		{ label: 'Opened', value: stats.totals.created },
		{ label: 'Closed', value: stats.totals.closed },
		{ label: 'Open now', value: stats.open },
		{ label: 'First response', value: stats.totals.avgResponseTime ?? '-' },
		{ label: 'Resolution', value: stats.totals.avgResolutionTime ?? '-' },
		{ label: 'Rating', value: stats.totals.avgRating ?? '-' }
	]);
</script>

<svelte:head>
	<title>Statistics - {data.guild?.name ?? 'Discord Tickets'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 pb-12">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-3xl font-bold">Statistics</h1>
		<nav
			aria-label="Time range"
			class="flex gap-1 rounded-lg bg-white p-1 shadow-sm dark:bg-slate-800"
		>
			{#each ranges as range (range)}
				<a
					href="?days={range}"
					data-sveltekit-noscroll
					aria-current={data.days === range ? 'page' : undefined}
					class="rounded-md px-3 py-1 text-sm font-medium {data.days === range
						? 'bg-blurple text-white'
						: 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'}"
					>{range === 365 ? '1 year' : `${range} days`}</a
				>
			{/each}
		</nav>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
		{#each tiles as tile (tile.label)}
			<div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
				<p class="text-sm text-gray-500 dark:text-slate-400">{tile.label}</p>
				<p class="text-2xl font-bold tabular-nums">{tile.value}</p>
			</div>
		{/each}
	</div>

	<section
		class="mt-6 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800"
		aria-labelledby="per-day"
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 id="per-day" class="text-xl font-bold">Tickets per day</h2>
			<div class="flex gap-4 text-sm text-gray-600 dark:text-slate-300">
				<span class="flex items-center gap-1.5"
					><span class="inline-block h-3 w-3 rounded-sm bg-[#2a78d6] dark:bg-[#3987e5]"
					></span>Opened</span
				>
				<span class="flex items-center gap-1.5"
					><span class="inline-block h-3 w-3 rounded-sm bg-[#eb6834] dark:bg-[#d95926]"
					></span>Closed</span
				>
			</div>
		</div>
		<div class="relative mt-2">
			<svg
				viewBox="0 0 {width} {height}"
				class="h-auto w-full"
				role="img"
				aria-label="Tickets opened and closed per day"
				onmouseleave={() => (hovered = null)}
			>
				{#each ticks as tick (tick)}
					<line
						x1={pad.left}
						x2={width - pad.right}
						y1={y(tick)}
						y2={y(tick)}
						class="stroke-gray-200 dark:stroke-slate-700"
						stroke-width="1"
					/>
					<text
						x={pad.left - 6}
						y={y(tick) + 4}
						text-anchor="end"
						class="fill-gray-500 text-[11px] dark:fill-slate-400">{tick}</text
					>
				{/each}
				{#each days as day, i (day.date)}
					{@const x = pad.left + i * slot + (slot - barW * 2 - 2) / 2}
					<path d={bar(x, day.created)} class="fill-[#2a78d6] dark:fill-[#3987e5]" />
					<path d={bar(x + barW + 2, day.closed)} class="fill-[#eb6834] dark:fill-[#d95926]" />
					{#if i % every === 0}
						<text
							x={pad.left + i * slot + slot / 2}
							y={height - 6}
							text-anchor="middle"
							class="fill-gray-500 text-[11px] dark:fill-slate-400">{label(day.date)}</text
						>
					{/if}
					<!-- hover target: the whole day's column -->
					<rect
						x={pad.left + i * slot}
						y={pad.top}
						width={slot}
						height={plotH}
						fill="transparent"
						role="presentation"
						onmouseenter={() => (hovered = i)}
						class={hovered === i ? 'fill-gray-500/10' : ''}
					/>
				{/each}
			</svg>
			{#if hovered !== null && days[hovered]}
				<div
					class="pointer-events-none absolute top-0 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700"
					style="left: min(calc({((pad.left + hovered * slot + slot / 2) / width) *
						100}% + 8px), calc(100% - 9rem))"
				>
					<p class="font-semibold">{label(days[hovered].date)}</p>
					<p>Opened: <span class="tabular-nums">{days[hovered].created}</span></p>
					<p>Closed: <span class="tabular-nums">{days[hovered].closed}</span></p>
				</div>
			{/if}
		</div>
		<details class="mt-2 text-sm">
			<summary class="cursor-pointer text-gray-500 dark:text-slate-400">Show as a table</summary>
			<table class="mt-2 w-full text-left tabular-nums">
				<thead><tr><th>Date</th><th>Opened</th><th>Closed</th></tr></thead>
				<tbody>
					{#each days as day (day.date)}
						<tr><td>{day.date}</td><td>{day.created}</td><td>{day.closed}</td></tr>
					{/each}
				</tbody>
			</table>
		</details>
	</section>

	<div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
		<section
			class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800"
			aria-labelledby="per-category"
		>
			<h2 id="per-category" class="mb-2 text-xl font-bold">Categories</h2>
			{#if stats.categories.length === 0}
				<p class="text-gray-500 dark:text-slate-400">No tickets in this time.</p>
			{:else}
				<table class="w-full text-left tabular-nums">
					<thead class="text-sm text-gray-500 dark:text-slate-400">
						<tr
							><th>Category</th><th class="text-right">Opened</th><th class="text-right">Closed</th
							></tr
						>
					</thead>
					<tbody>
						{#each stats.categories as category (category.id ?? 'none')}
							<tr class="border-t border-gray-100 dark:border-slate-700">
								<td class="py-1">{category.name ?? 'Deleted category'}</td>
								<td class="text-right">{category.created}</td>
								<td class="text-right">{category.closed}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
		<section
			class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800"
			aria-labelledby="per-staff"
		>
			<h2 id="per-staff" class="mb-2 text-xl font-bold">Staff</h2>
			{#if stats.staff.length === 0}
				<p class="text-gray-500 dark:text-slate-400">No claimed or closed tickets in this time.</p>
			{:else}
				<table class="w-full text-left tabular-nums">
					<thead class="text-sm text-gray-500 dark:text-slate-400">
						<tr
							><th>Member</th><th class="text-right">Claimed</th><th class="text-right">Closed</th
							></tr
						>
					</thead>
					<tbody>
						{#each stats.staff as member (member.id)}
							<tr class="border-t border-gray-100 dark:border-slate-700">
								<td class="flex items-center gap-2 py-1">
									{#if member.avatar}<img
											src={member.avatar}
											alt=""
											class="h-6 w-6 rounded-full"
										/>{/if}
									{member.displayName ?? member.username ?? member.id}
								</td>
								<td class="text-right">{member.claimed}</td>
								<td class="text-right">{member.closed}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
			<p class="mt-2 text-sm text-gray-500 dark:text-slate-400">
				Tickets in anonymous categories aren't counted here.
			</p>
		</section>
	</div>
</div>
