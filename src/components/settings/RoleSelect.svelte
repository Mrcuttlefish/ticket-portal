<script>
	/** A multi-select of server roles. `roles` should already exclude @everyone and carry `_style`. */
	/** @type {{ roles: any[], value: string[], label?: string, size?: string, exclude?: string[] }} */
	let { roles, value = $bindable([]), label = 'Roles', size = 'h-32', exclude = [] } = $props();
</script>

<select multiple aria-label={label} class="input form-multiselect {size} font-normal" bind:value>
	{#each roles.filter((r) => !exclude.includes(r.id)) as role (role.id)}
		<option value={role.id} class="m-1 rounded p-1" style={role._style}>
			{role.unicodeEmoji || ''}
			{role.name}
		</option>
	{/each}
</select>
