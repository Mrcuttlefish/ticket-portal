<script>
	/** Per-role ticket limits: `[{ role, limit }]`; the highest matching limit wins. */
	/** @type {{ roles: any[], value: { role: string, limit: number }[] }} */
	let { roles, value = $bindable([]) } = $props();

	const MAX = 50;
</script>

<div class="flex flex-col gap-2">
	{#each value as rule, i (i)}
		<div class="flex items-center gap-2">
			<select
				aria-label="Role for limit {i + 1}"
				class="input form-multiselect mt-0 grow font-normal"
				bind:value={rule.role}
			>
				<option value="" disabled>Choose a role</option>
				{#each roles as role (role.id)}
					<option value={role.id} style={role._style}>{role.unicodeEmoji || ''} {role.name}</option>
				{/each}
			</select>
			<input
				type="number"
				min="0"
				max="100"
				aria-label="Ticket limit {i + 1}"
				class="input form-input mt-0 w-24"
				bind:value={rule.limit}
			/>
			<button
				type="button"
				class="text-red-400 hover:text-red-600"
				aria-label="Remove limit {i + 1}"
				onclick={() => value.splice(i, 1)}
			>
				<i class="fa-solid fa-xmark"></i>
			</button>
		</div>
	{/each}
	{#if value.length < MAX}
		<button
			type="button"
			class="self-start rounded-lg px-3 py-1 text-base font-medium text-green-600 transition duration-300 hover:bg-green-500/10 dark:text-green-400"
			onclick={() => value.push({ role: '', limit: 1 })}
		>
			<i class="fa-solid fa-circle-plus"></i>
			Add role limit
		</button>
	{/if}
</div>
