<script>
	import { page } from '$app/stores';
	/** @type {{data: import('./$types').LayoutData, children?: import('svelte').Snippet}} */
	let { data, children } = $props();

	const { guild, user } = data;
	const ticketsHref = `/${$page.params.guild}/tickets`;
</script>

<svelte:head>
	{#if guild.logo}
		<link rel="icon" href={guild.logo} />
	{/if}
</svelte:head>

<header
	class="border-b border-dgrey-300 bg-white/70 backdrop-blur dark:border-dgrey-700 dark:bg-dgrey-900/70"
>
	<nav
		class="container mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
		aria-label="Portal"
	>
		<a href={ticketsHref} class="flex items-center gap-3 font-semibold">
			{#if guild.logo}
				<img src={guild.logo} alt="" class="h-8 w-8 rounded-full" />
			{:else}
				<span
					class="flex h-8 w-8 items-center justify-center rounded-full bg-blurple text-sm font-bold text-white"
					aria-hidden="true">{guild.name.slice(0, 1)}</span
				>
			{/if}
			<span>{guild.name}</span>
		</a>
		<div class="flex grow items-center gap-4 text-sm">
			<a
				href={ticketsHref}
				class="rounded-md px-2 py-1 transition hover:bg-dgrey-200 dark:hover:bg-dgrey-800"
				aria-current={$page.url.pathname.startsWith(ticketsHref) ? 'page' : undefined}
			>
				<i class="fa-solid fa-ticket"></i>
				Tickets
			</a>
			{#if guild.privilegeLevel >= 2}
				<a
					href={`/settings/${guild.id}`}
					data-sveltekit-reload
					class="rounded-md px-2 py-1 transition hover:bg-dgrey-200 dark:hover:bg-dgrey-800"
				>
					<i class="fa-solid fa-gear"></i>
					Settings
				</a>
			{/if}
		</div>
		<div class="flex items-center gap-3 text-sm">
			<span class="hidden text-gray-500 dark:text-gray-400 sm:inline">{user?.username}</span>
			<a href="/auth/logout" class="rounded-md px-2 py-1 transition hover:text-blurple">Log out</a>
		</div>
	</nav>
</header>

<main class="container mx-auto px-4 py-6">
	{@render children?.()}
</main>
