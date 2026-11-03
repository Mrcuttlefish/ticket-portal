<script>
	import { page } from '$app/stores';

	/** @type {{data: any, children?: import('svelte').Snippet}} */
	let { data, children } = $props();

	const { guild } = data;
	const base = `/settings/${guild.id}`;
	const tabs = [
		{ href: base, label: 'Overview', icon: 'fa-solid fa-house', exact: true },
		{ href: `${base}/general`, label: 'General', icon: 'fa-solid fa-gears' },
		{ href: `${base}/categories`, label: 'Categories', icon: 'fa-solid fa-list' },
		{ href: `${base}/panels`, label: 'Panels', icon: 'fa-solid fa-sliders' },
		{ href: `${base}/tags`, label: 'Tags', icon: 'fa-solid fa-tags' },
		{ href: `${base}/feedback`, label: 'Feedback', icon: 'fa-solid fa-comments' }
	];
	const active = (tab) =>
		tab.exact ? $page.url.pathname === tab.href : $page.url.pathname.startsWith(tab.href);
	const portalHref = `/${BigInt(guild.id).toString(36)}/tickets`;
</script>

<nav
	aria-label="Server settings"
	class="mb-6 flex items-center gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm dark:bg-slate-800"
>
	<span class="mr-2 flex shrink-0 items-center gap-2 px-2 font-semibold">
		{#if guild.logo}<img src={guild.logo} alt="" class="h-6 w-6 rounded-full" />{/if}
		<span class="max-w-40 truncate">{guild.name}</span>
	</span>
	{#each tabs as tab}
		<a
			href={tab.href}
			aria-current={active(tab) ? 'page' : undefined}
			class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition {active(
				tab
			)
				? 'bg-blurple text-white'
				: 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'}"
		>
			<i class={tab.icon}></i>
			{tab.label}
		</a>
	{/each}
	<a
		href={portalHref}
		data-sveltekit-reload
		class="ml-auto flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
	>
		<i class="fa-solid fa-ticket"></i>
		Tickets
	</a>
</nav>

{@render children?.()}
