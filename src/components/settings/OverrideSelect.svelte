<script>
	import { override } from '$lib/util/settings';

	/**
	 * A per-category override of an on/off server setting: null = use the server setting.
	 * @type {{ value: boolean | null, label: string, serverValue?: boolean }}
	 */
	let { value = $bindable(null), label, serverValue } = $props();

	const inherit =
		serverValue === undefined
			? 'Use server setting'
			: `Use server setting (${serverValue ? 'on' : 'off'})`;
</script>

<select
	aria-label={label}
	class="input form-multiselect font-normal"
	value={override.toSelect(value)}
	onchange={(e) => (value = override.fromSelect(e.currentTarget.value))}
>
	<option value="inherit">{inherit}</option>
	<option value="on">On</option>
	<option value="off">Off</option>
</select>
