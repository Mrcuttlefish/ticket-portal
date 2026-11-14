<script>
	/** Change the label, emoji and colour of the bot's buttons. `value` is buttonsToForm() state. */
	import RoleSelect from './RoleSelect.svelte';
	import { BUTTON_STYLES, CUSTOM_BUTTONS } from '$lib/util/settings';

	/**
	 * `access` (buttonRolesToForm() state) limits who can use each button; leave it out to hide those options.
	 * @type {{ value: Record<string, { label: string, emoji: string, style: string }>, access?: Record<string, { allow: string[], deny: string[] }>, roles?: any[] }}
	 */
	let { value = $bindable(), access = $bindable(), roles = [] } = $props();

	const input =
		'form-input w-full rounded-md border-transparent bg-gray-100 text-base shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800';
</script>

<div class="grid grid-cols-1 gap-3">
	{#each CUSTOM_BUTTONS as [name, title] (name)}
		<fieldset class="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9rem,1fr,6rem,8rem]">
			<legend class="sr-only">{title} button</legend>
			<span class="text-base font-medium">{title}</span>
			<input
				type="text"
				class={input}
				maxlength="80"
				placeholder="Default label"
				aria-label="{title} button label"
				bind:value={value[name].label}
			/>
			<input
				type="text"
				class={input}
				maxlength="64"
				placeholder="Emoji"
				aria-label="{title} button emoji"
				bind:value={value[name].emoji}
			/>
			<select class={input} aria-label="{title} button colour" bind:value={value[name].style}>
				<option value="">Default colour</option>
				{#each BUTTON_STYLES as [style, label] (style)}
					<option value={style}>{label}</option>
				{/each}
			</select>
			{#if access}
				<details
					class="sm:col-span-4"
					open={access[name].allow.length + access[name].deny.length > 0}
				>
					<summary class="cursor-pointer text-sm text-gray-500 dark:text-slate-400">
						Who can use it
						{#if access[name].allow.length + access[name].deny.length > 0}
							<span class="text-blurple">(limited)</span>
						{/if}
					</summary>
					<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="text-sm font-medium">
							Only these roles (empty: anyone who could already)
							<RoleSelect
								{roles}
								size="h-24"
								label="{title} button: only these roles"
								bind:value={access[name].allow}
							/>
						</label>
						<label class="text-sm font-medium">
							Not these roles
							<RoleSelect
								{roles}
								size="h-24"
								label="{title} button: not these roles"
								bind:value={access[name].deny}
							/>
						</label>
					</div>
				</details>
			{/if}
		</fieldset>
	{/each}
</div>
