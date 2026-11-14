<script>
	/** Change the label, emoji and colour of the bot's buttons. `value` is buttonsToForm() state. */
	import { BUTTON_STYLES, CUSTOM_BUTTONS } from '$lib/util/settings';

	/** @type {{ value: Record<string, { label: string, emoji: string, style: string }> }} */
	let { value = $bindable() } = $props();

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
		</fieldset>
	{/each}
</div>
