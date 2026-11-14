<script>
	/**
	 * Automation rules (Ticket Tool parity, P3): "when staff / the creator haven't replied for <after>, send a tag /
	 * close the ticket". `value` is automationsToForm() state; `after` is a duration like "4h".
	 */
	/** @type {{ value: { waitingOn: string, after: string, action: string, tag: string }[], tags?: { name: string }[] }} */
	let { value = $bindable([]), tags = [] } = $props();

	const MAX = 10;
	const input =
		'form-input rounded-md border-transparent bg-gray-100 text-base shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800';
</script>

<div class="flex flex-col gap-3">
	{#each value as rule, i (i)}
		<fieldset
			class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2 text-base dark:border-slate-600"
		>
			<legend class="sr-only">Automation {i + 1}</legend>
			<span>When</span>
			<select
				class={input}
				aria-label="Automation {i + 1}: waiting for"
				bind:value={rule.waitingOn}
			>
				<option value="STAFF">staff haven't</option>
				<option value="CREATOR">the creator hasn't</option>
			</select>
			<span>replied for</span>
			<input
				type="text"
				class="{input} w-24"
				required
				placeholder="e.g. 4h"
				aria-label="Automation {i + 1}: after"
				bind:value={rule.after}
			/>
			<select class={input} aria-label="Automation {i + 1}: action" bind:value={rule.action}>
				<option value="TAG">send a tag</option>
				<option value="CLOSE">close the ticket</option>
			</select>
			{#if rule.action === 'TAG'}
				<select class={input} required aria-label="Automation {i + 1}: tag" bind:value={rule.tag}>
					<option value="" disabled>Choose a tag</option>
					{#each tags as tag (tag.name)}
						<option value={tag.name}>{tag.name}</option>
					{/each}
				</select>
			{/if}
			<button
				type="button"
				class="ml-auto text-red-400 hover:text-red-600"
				aria-label="Remove automation {i + 1}"
				onclick={() => value.splice(i, 1)}
			>
				<i class="fa-solid fa-xmark"></i>
			</button>
		</fieldset>
	{/each}
	{#if value.length < MAX}
		<button
			type="button"
			class="self-start rounded-lg px-3 py-1 text-base font-medium text-green-600 transition duration-300 hover:bg-green-500/10 dark:text-green-400"
			onclick={() => value.push({ action: 'TAG', after: '4h', tag: '', waitingOn: 'STAFF' })}
		>
			<i class="fa-solid fa-circle-plus"></i>
			Add automation
		</button>
	{/if}
</div>
