<script>
	import RoleSelect from './RoleSelect.svelte';

	/**
	 * Conditional pings: if the ticket creator has any of `roles`, ping `ping` instead of the default ping roles.
	 * @type {{ roles: any[], value: { roles: string[], ping: string[] }[] }}
	 */
	let { roles, value = $bindable([]) } = $props();

	const MAX = 50;
</script>

<div class="flex flex-col gap-3">
	{#each value as rule, i (i)}
		<fieldset class="rounded-lg border border-gray-200 p-3 dark:border-slate-600">
			<legend class="px-1 text-sm font-semibold">Rule {i + 1}</legend>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div>
					<p class="text-sm font-medium">If the creator has any of</p>
					<RoleSelect {roles} label="Creator roles for rule {i + 1}" bind:value={rule.roles} />
				</div>
				<div>
					<p class="text-sm font-medium">Ping these roles instead</p>
					<RoleSelect {roles} label="Roles to ping for rule {i + 1}" bind:value={rule.ping} />
				</div>
			</div>
			<button
				type="button"
				class="mt-2 text-sm text-red-500 hover:underline"
				onclick={() => value.splice(i, 1)}
			>
				Remove rule
			</button>
		</fieldset>
	{/each}
	{#if value.length < MAX}
		<button
			type="button"
			class="self-start rounded-lg px-3 py-1 text-base font-medium text-green-600 transition duration-300 hover:bg-green-500/10 dark:text-green-400"
			onclick={() => value.push({ roles: [], ping: [] })}
		>
			<i class="fa-solid fa-circle-plus"></i>
			Add ping rule
		</button>
	{/if}
</div>
