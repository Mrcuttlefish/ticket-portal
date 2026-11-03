<script>
	import { fly } from 'svelte/transition';
	import emoji from 'emoji-name-map';
	import { v4 as uuidv4 } from 'uuid';
	import Required from '../Required.svelte';

	/**
	 * `question` is the reactive question object from `questionsState`;
	 * changes are made to a copy and only written back when the user saves.
	 * @type {{isOpen: boolean, close: Function, question: any}}
	 */
	let { isOpen, close, question } = $props();

	const MAX_OPTIONS = 25;

	// options saved before this editor existed have no `id`; give them one for keyed rendering
	let options = $state(
		($state.snapshot(question.options) ?? []).map((o) => ({
			description: '',
			emoji: '',
			label: '',
			value: '',
			...o,
			id: o.id ?? uuidv4()
		}))
	);
	let expanded = $state(null);
	let error = $state('');

	function add() {
		if (options.length >= MAX_OPTIONS) return;
		const option = {
			id: uuidv4(),
			description: '',
			emoji: '',
			label: `Option ${options.length + 1}`,
			value: ''
		};
		options.push(option);
		expanded = option.id;
	}

	function remove(i) {
		options.splice(i, 1);
	}

	function move(i, by) {
		const j = i + by;
		if (j < 0 || j >= options.length) return;
		[options[i], options[j]] = [options[j], options[i]];
	}

	function save(event) {
		event.preventDefault();
		if (options.length === 0) {
			error = 'Add at least one option.';
			return;
		}
		const missing = options.find((o) => !o.label.trim() || !o.value.trim());
		if (missing) {
			expanded = missing.id;
			error = 'Every option needs a label and a value.';
			return;
		}
		question.options = $state.snapshot(options);
		close();
	}
</script>

{#if isOpen}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="options-modal-title"
		class="modal mx-auto my-4 max-w-lg sm:my-12 md:my-24 lg:my-32"
		transition:fly|global={{ y: 50 }}
	>
		<div
			class="pointer-events-auto max-h-full w-full overflow-y-auto rounded-xl bg-white p-4 text-gray-800 shadow-sm dark:bg-slate-700 dark:text-slate-300"
		>
			<form onsubmit={save} novalidate>
				<div class="m-2 flex flex-col gap-6 sm:m-4">
					<div class="flex items-center gap-5">
						<i class="fa-regular fa-rectangle-list text-4xl"></i>
						<div>
							<h3 id="options-modal-title" class="text-2xl font-bold leading-tight">
								{question.label}
							</h3>
							<h4 class="text-lg font-semibold leading-tight text-gray-500 dark:text-slate-400">
								Options ({options.length}/{MAX_OPTIONS})
							</h4>
						</div>
					</div>

					<div class="flex flex-col gap-2">
						{#each options as o, i (o.id)}
							<div class="rounded-xl bg-gray-100/50 p-4 dark:bg-slate-800/50">
								<div class="flex items-center gap-2 md:gap-4">
									<div class="flex flex-col text-gray-500 dark:text-slate-400">
										<button
											type="button"
											class="hover:text-blurple disabled:opacity-25"
											title="Move up"
											aria-label="Move {o.label} up"
											disabled={i === 0}
											onclick={() => move(i, -1)}
										>
											<i class="fa-solid fa-angle-up"></i>
										</button>
										<button
											type="button"
											class="hover:text-blurple disabled:opacity-25"
											title="Move down"
											aria-label="Move {o.label} down"
											disabled={i === options.length - 1}
											onclick={() => move(i, 1)}
										>
											<i class="fa-solid fa-angle-down"></i>
										</button>
									</div>
									{#if emoji.get(o.emoji)}
										<span class="text-3xl">{emoji.get(o.emoji)}</span>
									{/if}
									<button
										type="button"
										class="flex w-full items-center justify-between text-left font-medium transition duration-300 hover:text-blurple"
										aria-expanded={expanded === o.id}
										onclick={() => (expanded = expanded === o.id ? null : o.id)}
									>
										<span class="break-all">{o.label || 'Untitled option'}</span>
										<i
											class="fa-solid {expanded === o.id ? 'fa-angle-up' : 'fa-angle-down'} text-xl"
										></i>
									</button>
									<button
										type="button"
										class="text-red-300 transition duration-300 hover:text-red-500 dark:text-red-500/50 dark:hover:text-red-500"
										title="Remove"
										aria-label="Remove {o.label}"
										onclick={() => remove(i)}
									>
										<i class="fa-solid fa-xmark"></i>
									</button>
								</div>
								{#if expanded === o.id}
									<div class="mt-4 flex flex-col gap-3">
										<label class="font-medium">
											Label
											<Required />
											<input
												type="text"
												class="input form-input text-sm"
												required
												maxlength="100"
												bind:value={o.label}
											/>
										</label>
										<label class="font-medium">
											Description
											<input
												type="text"
												class="input form-input text-sm"
												maxlength="100"
												bind:value={o.description}
											/>
										</label>
										<label class="font-medium">
											Emoji
											<span class="text-sm font-normal text-gray-500 dark:text-slate-400">
												(a default emoji name, or a custom emoji ID)
											</span>
											<span class="text-2xl">{emoji.get(o.emoji) ?? ''}</span>
											<input
												type="text"
												class="input form-input text-sm"
												maxlength="100"
												bind:value={o.emoji}
											/>
										</label>
										<label class="font-medium">
											Value
											<Required />
											<span class="text-sm font-normal text-gray-500 dark:text-slate-400">
												(the text stored and used in placeholders)
											</span>
											<input
												type="text"
												class="input form-input text-sm"
												required
												maxlength="100"
												bind:value={o.value}
											/>
										</label>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					{#if options.length < MAX_OPTIONS}
						<div class="text-center">
							<button
								type="button"
								class="rounded-lg p-2 px-5 font-medium text-green-500 transition duration-300 hover:text-green-300 dark:text-green-500 dark:hover:text-green-500/50"
								onclick={add}
							>
								<i class="fa-solid fa-circle-plus"></i>
								Add
							</button>
						</div>
					{/if}

					{#if error}
						<p role="alert" class="text-center font-medium text-red-500">{error}</p>
					{/if}
				</div>
				<div class="m-2 flex justify-end gap-4">
					<button
						type="button"
						class="rounded-lg p-2 px-5 font-medium transition duration-300 hover:bg-gray-200 dark:hover:bg-slate-600"
						onclick={() => close()}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-green-300 p-2 px-5 font-medium transition duration-300 hover:bg-green-500 hover:text-white dark:bg-green-500/75 dark:hover:bg-green-500 dark:hover:text-white"
					>
						<i class="fa-solid fa-check"></i>
						Save
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
