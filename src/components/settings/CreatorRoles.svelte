<script>
	/**
	 * Roles given to or taken from the ticket's creator when a ticket opens, is claimed or closes.
	 * `value` is creatorRolesToForm() state. The bot only accepts roles you could manage yourself, that are below
	 * its own highest role, and (for roles it gives) that don't grant moderation or admin permissions.
	 */
	import RoleSelect from './RoleSelect.svelte';
	import { CREATOR_ROLE_EVENTS } from '$lib/util/settings';

	/** @type {{ roles: any[], value: Record<string, { add: string[], remove: string[] }> }} */
	let { roles, value = $bindable() } = $props();
</script>

<div class="grid grid-cols-1 gap-4">
	{#each CREATOR_ROLE_EVENTS as [event, title] (event)}
		<fieldset class="rounded-lg border border-gray-200 p-3 dark:border-slate-600">
			<legend class="px-1 text-base font-medium">{title}</legend>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label class="text-sm font-medium">
					Give
					<RoleSelect {roles} label="{title}: give" size="h-24" bind:value={value[event].add} />
				</label>
				<label class="text-sm font-medium">
					Take away
					<RoleSelect
						{roles}
						label="{title}: take away"
						size="h-24"
						bind:value={value[event].remove}
					/>
				</label>
			</div>
		</fieldset>
	{/each}
</div>
