<script>
	import { getContext } from 'svelte';
	import { renderMarkdown } from '$lib/util/markdown';
	import Required from './Required.svelte';
	/** @type {{tag: any}} */
	let { tag = $bindable() } = $props();
	tag.matchType ??= 'REGEX';
	tag.autoDm ??= false;
	const uid = $derived(tag.id ?? 'new');
</script>

<div>
	<label>
		<span class="font-medium">Name</span>
		<Required />
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="The tag name - can contain UNICODE emoji (not emoji names)"
		></i>
		<input type="text" class="input form-input" required bind:value={tag.name} />
	</label>
</div>
<div class="grid grid-cols-1 gap-2 sm:grid-cols-[10rem,1fr]">
	<label>
		<span class="font-medium">Trigger type</span>
		<select class="input form-multiselect" bind:value={tag.matchType}>
			<option value="REGEX">Regular expression</option>
			<option value="WILDCARD">Wildcard</option>
		</select>
	</label>
	<label>
		<span class="font-medium">Auto tag trigger</span>
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title={tag.matchType === 'WILDCARD'
				? 'Optional. The whole message must match; * matches anything, e.g. how do i reset my *'
				: 'Optional. A regular expression that triggers this tag when it matches part of a message'}
		></i>
		<input
			type="text"
			class="input form-input"
			maxlength="200"
			placeholder={tag.matchType === 'WILDCARD'
				? 'e.g. how do i reset my *'
				: 'e.g. reset.*password'}
			bind:value={tag.regex}
		/>
	</label>
</div>
<div>
	<label for="autoDm-{uid}" class="font-medium">
		Send in a DM
		<input id="autoDm-{uid}" type="checkbox" class="form-checkbox" bind:checked={tag.autoDm} />
		<span class="block text-sm font-normal text-gray-500 dark:text-slate-400"
			>When the trigger matches, send the tag to the member privately instead of replying. If their
			DMs are closed, it replies.</span
		>
	</label>
</div>
<div>
	<label class="font-medium">
		<span class="font-medium">Content</span>
		<Required />
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="The tag content"
		></i>
		<textarea class="input form-input h-24" maxlength="4096" required bind:value={tag.content}
		></textarea>
	</label>
	{#if tag.content}
		<p class="text-sm font-medium">Preview</p>
		<div
			class="prose prose-slate block w-full break-words rounded-md bg-slate-100 p-3 font-mono text-sm shadow-sm dark:prose-invert prose-a:text-blurple dark:bg-slate-900"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
			{@html renderMarkdown(tag.content.replace(/\n/g, '\n\n'), [
				[/{+\s?(user)?name\s?}+/gi, '@' + getContext('user').username]
			])}
		</div>
	{/if}
</div>
