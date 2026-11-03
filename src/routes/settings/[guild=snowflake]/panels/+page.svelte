<script>
	import { run, preventDefault } from 'svelte/legacy';

	import { page } from '$app/stores';
	import MultiSelect from 'svelte-multiselect';
	import emoji from 'emoji-name-map';
	import Required from '$components/Required.svelte';
	import Hint from '$components/settings/Hint.svelte';
	import ErrorBox from '$components/ErrorBox.svelte';
	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let { categories, channels } = $state(data);
	const componentsV2 = data.componentsV2;
	channels = channels.filter((c) => c.type === 0); // text
	let error = $state(null);
	let loading = $state(false);
	let panel = $state({
		categories: [],
		channel: 'new',
		description: '',
		image: '',
		title: '',
		type: 'BUTTON',
		thumbnail: ''
	});

	// 'new' sends a panel; 'edit' updates one the bot already sent, found by its message link
	let mode = $state('new');
	let messageLink = $state('');

	/**
	 * Read a Discord message link (https://discord.com/channels/<guild>/<channel>/<message>).
	 * @param {string} link
	 * @returns {{ guild: string, channel: string, message: string } | null}
	 */
	const parseMessageLink = (link) => {
		const match = link
			.trim()
			.match(
				/^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)\/?$/
			);
		return match ? { guild: match[1], channel: match[2], message: match[3] } : null;
	};

	let selectedCategories = $state([]);
	const categoryOptions = categories.reduce((acc, c) => {
		acc[(emoji.get(c.emoji) ?? '') + c.name] = c.id;
		return acc;
	}, {});

	const getChannelName = (id) => {
		return channels.find((c) => c.id === id)?.name;
	};

	const submit = async () => {
		try {
			// error = null;
			loading = true;
			const json = { ...panel };
			if (mode === 'edit') {
				const link = parseMessageLink(messageLink);
				if (!link)
					throw {
						message:
							'Paste the link to the panel message (right-click it in Discord, then Copy Message Link).'
					};
				if (link.guild !== $page.params.guild)
					throw { message: 'That message is in a different server.' };
				json.channel = link.channel;
				json.message = link.message;
			} else if (json.channel === 'new') json.channel = null;
			json.categories = selectedCategories.map((name) => categoryOptions[name]);
			const url = `/api/admin/guilds/${$page.params.guild}/panels`;
			const response = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(json),
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				}
			});
			const body = await response.json();
			if (!response.ok) throw body;
			else window.location = './';
		} catch (err) {
			loading = false;
			error = err;
			window.scroll({
				top: 0,
				behavior: 'smooth'
			});
		}
	};

	run(() => {
		panel.type =
			panel.categories.length > 5
				? 'MENU'
				: panel.categories.length > 1 && panel.type === 'MESSAGE'
					? 'BUTTON'
					: panel.type;
	});
</script>

<div class="mx-auto mb-6 max-w-5xl px-4">
	<h1 class="text-3xl font-bold">{mode === 'edit' ? 'Update a panel' : 'Create a panel'}</h1>
	<p class="text-gray-500 dark:text-slate-400">
		{mode === 'edit'
			? 'Replace the contents of a panel the bot has already sent.'
			: 'Send a message members can use to open tickets.'}
		<a
			href="https://discordtickets.app/configuration/panels"
			target="_blank"
			rel="noopener noreferrer"
			class="text-blurple hover:underline">Documentation</a
		>
	</p>
</div>
<div class="m-2 mx-auto max-w-3xl sm:p-4">
	<p class="mb-4 rounded-lg bg-gray-100 p-3 text-sm dark:bg-slate-800" data-testid="panel-layout">
		<i class="fa-solid fa-table-columns text-blurple"></i>
		Layout:
		<span class="font-semibold"
			>{componentsV2 ? "Discord's new message layout" : 'Classic embeds'}</span
		>.
		<a href="../general#appearance" class="text-blurple hover:underline">Change</a>
		{#if componentsV2}
			<br /><span class="text-gray-500 dark:text-slate-400"
				>Panels you sent before turning this on keep the old look until you update them here.</span
			>
		{/if}
	</p>
	{#if error}
		<ErrorBox {error} />
	{/if}

	<div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-700">
		<div class="text-center">
			{#if mode === 'edit'}
				<p class="p-2 text-cyan-500">
					<i class="fa-solid fa-circle-info text-2xl"></i>
					Fill in the whole panel: everything in the message is replaced.
				</p>
			{:else if panel.channel !== 'new' && panel.type === 'MESSAGE'}
				<p class="p-2 text-cyan-500">
					<i class="fa-solid fa-circle-info text-2xl"></i>
					Make sure members can read and send messages in
					<span class="font-mono">#{getChannelName(panel.channel)}</span>.
				</p>
			{:else if panel.channel !== 'new' && panel.type !== 'MESSAGE'}
				<p class="p-2 text-cyan-500">
					<i class="fa-solid fa-circle-info text-2xl"></i>
					Make sure members can read but not send messages in
					<span class="font-mono">#{getChannelName(panel.channel)}</span>.
				</p>
			{/if}
		</div>
		<form onsubmit={preventDefault(() => submit())} class="my-4 text-lg">
			<fieldset class="mb-4 flex flex-wrap gap-x-6 gap-y-2">
				<legend class="sr-only">Send a new panel or update one</legend>
				<label class="flex items-center gap-2 font-medium">
					<input type="radio" class="form-radio" name="mode" value="new" bind:group={mode} />
					Send a new panel
				</label>
				<label class="flex items-center gap-2 font-medium">
					<input type="radio" class="form-radio" name="mode" value="edit" bind:group={mode} />
					Update an existing panel
				</label>
			</fieldset>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label>
						<span class="font-medium">Type</span>
						<select class="input form-multiselect font-normal" required bind:value={panel.type}>
							<option value="BUTTON" class="p-1" disabled={panel.categories.length > 5}>
								<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" default /> -->
								Buttons
							</option>
							<option value="MENU" class="p-1">
								<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" /> -->
								Select menu (dropdown)
							</option>
							<!-- <option value="MESSAGE" class="p-1" disabled={panel.categories.length > 1}>
								<i class="fa-solid fa-at text-gray-500 dark:text-slate-400" />
								Message
							</option> -->
						</select>
						<Hint>How will members use the panel?</Hint>
					</label>
				</div>
				{#if mode === 'edit'}
					<div>
						<label class="font-medium">
							<span class="font-medium">Panel message link</span>
							<Required />
							<input
								type="url"
								class="input form-input font-normal"
								required
								placeholder="https://discord.com/channels/…"
								bind:value={messageLink}
							/>
							<Hint>Right-click the panel in Discord, then Copy Message Link</Hint>
						</label>
					</div>
				{:else}
					<div>
						<label class="font-medium">
							<span class="font-medium">Channel</span>
							<select
								required
								class="input form-multiselect font-normal"
								bind:value={panel.channel}
							>
								<option value="new">Create a new channel</option>
								<hr />
								{#each channels as channel}
									{channel.id}
									<option value={channel.id} class="p-1">
										<!-- <i class="fa-solid fa-hashtag text-gray-500 dark:text-slate-400" /> -->
										{channel.name}
									</option>
								{/each}
							</select>
							<Hint>The channel to send the panel message to</Hint>
						</label>
					</div>
				{/if}
				<div>
					<label class="font-medium">
						<span class="font-medium">Categories</span>
						<Required />
						<MultiSelect
							bind:selected={selectedCategories}
							outerDivClass="text-base my-1 p-2 rounded-md border-transparent bg-gray-100 dark:bg-slate-800 font-normal shadow-sm transition-colors has-[:focus]:ring-2 has-[:focus]:ring-blurple"
							inputClass="p-0 rounded-md bg-transparent transition-colors border-0 focus:ring-0"
							ulSelectedClass="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300"
							liSelectedClass="bg-blurple text-white text-sm font-semibold font-mono"
							ulOptionsClass="bg-white dark:bg-slate-900 p-2 max-h-48 overflow-y-auto"
							liOptionClass="rounded-md"
							liActiveOptionClass="bg-blurple text-white"
							liUserMsgClass="text-red-700 dark:text-red-500 bg-red-400/40 dark:bg-red-500/20"
							liActiveUserMsgClass=""
							maxSelectMsgClass="text-xs"
							noMatchingOptionsMsg="Create a category in the categories section"
							required={true}
							maxSelect={panel.type === 'MENU' ? 25 : 5}
							options={Object.keys(categoryOptions)}
						/>
						<Hint>The category options to be available</Hint>
					</label>
				</div>
				<div>
					<label>
						<span class="font-medium">Title</span>
						<input type="text" class="input form-input" required bind:value={panel.title} />
						<Hint>The embed title</Hint>
					</label>
				</div>
				<div>
					<label>
						<span class="font-medium">Large image</span>
						<input type="url" class="input form-input" bind:value={panel.image} />
						<Hint>Optional - the embed image</Hint>
					</label>
				</div>
				<div>
					<label>
						<span class="font-medium">Small image (thumbnail)</span>
						<input type="url" class="input form-input" bind:value={panel.thumbnail} />
						<Hint>Optional - the embed thumbnail</Hint>
					</label>
				</div>
				<div>
					<label class="font-medium">
						<span class="font-medium">Description</span>
						<textarea class="input form-input h-24" maxlength="4096" bind:value={panel.description}
						></textarea>
						<Hint>Optional - the embed description</Hint>
					</label>
				</div>
				<div class="place-self-center">
					<button
						type="submit"
						disabled={loading}
						class="mt-4 rounded-lg bg-green-300 p-2 px-5 font-medium transition duration-300 hover:bg-green-500 hover:text-white disabled:cursor-not-allowed dark:bg-green-500/50 dark:hover:bg-green-500 dark:hover:text-white"
					>
						{#if loading}
							<i class="fa-solid fa-spinner animate-spin"></i>
						{/if}
						{mode === 'edit' ? 'Update' : 'Create'}
					</button>
				</div>
			</div>
		</form>
	</div>
	<div class="mx-auto mt-8 max-w-lg text-center text-base">
		<div class="rounded-xl border-2 border-cyan-500 bg-cyan-500/20 p-2">
			<i class="fa-solid fa-circle-info text-2xl text-cyan-500"></i>
			<br />
			To change a panel you've already sent, choose <b>Update an existing panel</b> above. To remove
			one, delete the message or channel in Discord.
		</div>
	</div>
</div>
