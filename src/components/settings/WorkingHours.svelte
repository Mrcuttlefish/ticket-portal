<script>
	/** A timezone and a start and end time for each day. `value` is workingHoursToForm() state. */
	import zones from '$lib/timezones.json';
	import Required from '$components/Required.svelte';

	/** @type {{ value: any[], id?: string }} */
	let { value = $bindable(), id = 'timezones' } = $props();

	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const time =
		'form-input rounded-md border-transparent bg-gray-100 text-center shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800';
</script>

<label class="font-medium">
	Timezone
	<Required />
	<input type="text" list={id} class="input form-input" required bind:value={value[0]} />
	<datalist {id}>
		{#each zones as zone}
			<option value={zone}></option>
		{/each}
	</datalist>
</label>
<div class="grid grid-cols-1 gap-2">
	{#each days as day, index}
		<div class="grid grid-cols-[6rem,1fr,auto,1fr] items-center gap-2">
			<span class="font-medium">{day}</span>
			<input type="time" aria-label="{day} start" class={time} bind:value={value[index + 1][0]} />
			<i class="fa-solid fa-arrow-right-long text-gray-400"></i>
			<input type="time" aria-label="{day} end" class={time} bind:value={value[index + 1][1]} />
		</div>
	{/each}
</div>
