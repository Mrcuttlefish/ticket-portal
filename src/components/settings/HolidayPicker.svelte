<script>
	import { normaliseHolidays } from '$lib/util/settings';

	/** @type {{ value: string[] }} */
	let { value = $bindable([]) } = $props();

	let date = $state('');
	const today = new Date().toISOString().slice(0, 10);

	function add() {
		if (!date) return;
		value = normaliseHolidays([...value, date]);
		date = '';
	}

	function remove(d) {
		value = value.filter((x) => x !== d);
	}

	function removePast() {
		value = value.filter((d) => d >= today);
	}

	const format = (d) =>
		new Intl.DateTimeFormat('default', { dateStyle: 'medium', timeZone: 'UTC' }).format(
			new Date(`${d}T00:00:00Z`)
		);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center gap-2">
		<input
			type="date"
			aria-label="Holiday date"
			class="input form-input mt-0 grow"
			bind:value={date}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					add();
				}
			}}
		/>
		<button
			type="button"
			class="rounded-lg px-3 py-1 font-medium text-green-600 transition duration-300 hover:bg-green-500/10 disabled:opacity-50 dark:text-green-400"
			disabled={!date}
			aria-label="Add holiday"
			onclick={add}
		>
			<i class="fa-solid fa-circle-plus"></i>
			Add
		</button>
	</div>
	{#if value.length > 0}
		<ul class="flex flex-wrap gap-2" aria-label="Holidays">
			{#each value as d (d)}
				<li
					class="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-normal dark:bg-slate-800"
					class:opacity-50={d < today}
				>
					<time datetime={d}>{format(d)}</time>
					<button
						type="button"
						class="text-red-400 hover:text-red-600"
						aria-label="Remove {d}"
						onclick={() => remove(d)}
					>
						<i class="fa-solid fa-xmark"></i>
					</button>
				</li>
			{/each}
		</ul>
		{#if value.some((d) => d < today)}
			<button
				type="button"
				class="self-start text-sm text-gray-500 hover:underline dark:text-slate-400"
				onclick={removePast}
			>
				Remove past dates
			</button>
		{/if}
	{:else}
		<p class="text-sm font-normal text-gray-500 dark:text-slate-400">No holidays set.</p>
	{/if}
</div>
