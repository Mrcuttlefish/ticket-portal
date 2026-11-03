<script>
	import { modals } from 'svelte-modals';
	import OptionsModal from './OptionsModal.svelte';
	import Required from '../Required.svelte';
	/** @type {{question: any}} */
	let { question = $bindable() } = $props();

	// Discord allows at most 25 choices, and never more than there are options
	$effect(() => {
		const limit = Math.min(25, Math.max(1, question.options?.length ?? 0));
		if (question.maxLength > limit) question.maxLength = limit;
		if (question.minLength > question.maxLength) question.minLength = question.maxLength;
	});
</script>

<div>
	<label class="font-medium">
		Label
		<Required />
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="The title of the question"
		></i>
		<input
			type="text"
			class="input form-input text-sm"
			required
			maxlength="45"
			bind:value={question.label}
		/>
	</label>
</div>
<div>
	<label class="font-medium">
		Most choices
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="The most options a member can pick"
		></i>
		<input
			type="number"
			class="input form-input text-sm"
			required
			min="1"
			max="25"
			bind:value={question.maxLength}
		/>
	</label>
</div>
<div>
	<label class="font-medium">
		Fewest choices
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="The fewest options a member must pick (when the question is required)"
		></i>
		<input
			type="number"
			class="input form-input text-sm"
			default="1"
			required
			min="0"
			max="25"
			bind:value={question.minLength}
		/>
	</label>
</div>
<div>
	<label class="font-medium">
		Required
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="When off, members can leave this menu empty"
		></i>
		<input type="checkbox" class="form-checkbox" bind:checked={question.required} />
	</label>
</div>
<div>
	<div class="font-medium">
		Options ({question.options?.length ?? 0}/25)
		<Required />
		<i
			class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
			title="The options that members can choose from"
		></i>
		<button
			type="button"
			class="rounded-lg px-2 font-medium text-yellow-500 transition duration-300 hover:text-yellow-300 disabled:cursor-not-allowed dark:text-yellow-500 dark:hover:text-yellow-500/50"
			onclick={() => modals.open(OptionsModal, { question })}
		>
			<i class="fa-solid fa-pencil"></i>
			Edit
		</button>
	</div>
	<div>
		<ul class="list-inside list-disc">
			{#each question.options ?? [] as option}
				<li>{option.label}</li>
			{/each}
		</ul>
	</div>
</div>
<div>
	<div>
		<label class="font-medium">
			Placeholder
			<i
				class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
				title="The placeholder (label)"
			></i>
			<input
				type="text"
				class="input form-input text-sm"
				maxlength="100"
				bind:value={question.placeholder}
			/>
		</label>
	</div>
</div>
