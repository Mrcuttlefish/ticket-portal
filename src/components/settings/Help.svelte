<script>
	/** @type {{ text: string }} */
	let { text } = $props();
</script>

<i
	class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
	title={text}
	aria-label={text}
	role="img"
></i>
