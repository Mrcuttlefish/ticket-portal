<script>
	import { page } from '$app/stores';
	import zones from '$lib/timezones.json';
	import HolidayPicker from '$components/settings/HolidayPicker.svelte';
	import Section from '$components/settings/Section.svelte';
	import Hint from '$components/settings/Hint.svelte';
	import SaveBar from '$components/settings/SaveBar.svelte';
	import {
		WEBHOOK_SECRET_MASK,
		durationToInput,
		inputToDuration,
		normaliseHolidays,
		parseWebhookUrl,
		webhookSecretPayload,
		workingHoursFromForm,
		workingHoursToForm
	} from '$lib/util/settings';
	import Required from '$components/Required.svelte';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import ErrorBox from '$components/ErrorBox.svelte';
	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let modified = $state(false);

	beforeNavigate((navigation) => {
		if (modified && !confirm('You have unsaved changes; are you sure you want to leave?')) {
			navigation.cancel();
		}
	});

	onMount(() => {
		window.addEventListener('beforeunload', (event) => {
			if (modified) {
				event.preventDefault();
				event.returnValue = '';
			}
		});
	});

	let { settings, channels, locales, roles } = $state(data);

	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	channels = channels.filter((c) => c.type === 0); // text
	roles = roles.filter((r) => r.name !== '@everyone').sort((a, b) => b.rawPosition - a.rawPosition);
	roles.forEach((r) => {
		r._hexColor = r.color > 0 ? `#${r.color.toString(16).padStart(6, '0')}` : null;
		r._style = r._hexColor ? `color: ${r._hexColor}` : '';
	});
	settings.autoClose = durationToInput(settings.autoClose);
	settings.logChannel = settings.logChannel ?? '';
	settings.staleAfter = durationToInput(settings.staleAfter);
	settings.workingHours = workingHoursToForm(settings.workingHours);
	settings.holidays = normaliseHolidays(settings.holidays);
	settings.closeRequests ??= true;
	settings.ghostPing ??= false;
	settings.ticketNumberOffset ??= 0;
	settings.webhookUrl ??= '';

	// the bot never sends the secret back, only a mask when one is set
	let hadWebhookSecret = $state(settings.webhookSecret === WEBHOOK_SECRET_MASK);
	let webhookSecret = $state('');
	let removeWebhookSecret = $state(false);

	let autoTag = $state(Array.isArray(settings.autoTag) ? 'custom' : settings.autoTag); // there are 2 inputs for autoTag, need separate variables
	let error = $state(null);
	let loading = $state(false);
	let saved = $state(false);

	const submit = async (event) => {
		event?.preventDefault();
		try {
			saved = false;
			// error = null;
			loading = true;
			const json = { ...settings };
			json.autoClose = inputToDuration(settings.autoClose, { field: 'Auto close after' });
			json.staleAfter = inputToDuration(settings.staleAfter, { field: 'Stale after' });
			json.holidays = normaliseHolidays(settings.holidays);
			json.ticketNumberOffset = Number(settings.ticketNumberOffset) || 0;
			json.webhookUrl = parseWebhookUrl(settings.webhookUrl);
			json.webhookSecret = webhookSecretPayload({
				input: webhookSecret,
				hadSecret: hadWebhookSecret,
				remove: removeWebhookSecret
			});
			if (autoTag !== 'custom') json.autoTag = autoTag;
			else if (!Array.isArray(settings.autoTag)) json.autoTag = []; // it only updates if you select (and optionally deselect) a channel
			if (settings.logChannel === '') json.logChannel = null;
			json.workingHours = workingHoursFromForm(settings.workingHours);

			const response = await fetch(`/api/admin/guilds/${$page.params.guild}/settings`, {
				method: 'PATCH',
				body: JSON.stringify(json),
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8'
				}
			});
			const body = await response.json();

			if (!response.ok) {
				throw body;
			} else {
				modified = false;
				saved = true;
				error = null;
				loading = false;
				hadWebhookSecret = !removeWebhookSecret && (hadWebhookSecret || !!webhookSecret);
				webhookSecret = '';
				removeWebhookSecret = false;
			}
		} catch (err) {
			loading = false;
			error = err;
			window.scroll({
				top: 0,
				behavior: 'smooth'
			});
		}
	};
</script>

<svelte:head>
	<title>General settings - {data.guild?.name ?? 'Discord Tickets'}</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<h1 class="mb-1 text-3xl font-bold">General settings</h1>
	<p class="mb-6 text-gray-500 dark:text-slate-400">
		These apply to every category unless a category overrides them.
		<a
			href="https://discordtickets.app/configuration/general"
			target="_blank"
			rel="noopener noreferrer"
			class="text-blurple hover:underline">Documentation</a
		>
	</p>
	{#if error}
		<ErrorBox {error} />
	{/if}
	<form
		onsubmit={submit}
		oninput={() => ((modified = true), (saved = false))}
		onchange={() => ((modified = true), (saved = false))}
		class="flex flex-col gap-6"
	>
		<Section id="tickets" title="Tickets" icon="fa-solid fa-ticket">
			<label for="closeRequests" class="flex items-start gap-3 font-medium">
				<input
					type="checkbox"
					id="closeRequests"
					class="form-checkbox mt-1"
					bind:checked={settings.closeRequests}
				/>
				<span>
					Close requests
					<Hint>
						Ask the ticket creator to confirm when staff use /close or the close button. When off,
						tickets close straight away.
					</Hint>
				</span>
			</label>
			<div class="flex flex-col gap-2">
				<p class="font-medium">Buttons on the opening message</p>
				<label for="claimButton" class="flex items-center gap-3 text-base">
					<input
						type="checkbox"
						id="claimButton"
						class="form-checkbox"
						bind:checked={settings.claimButton}
					/>
					Claim / unclaim (only in categories with claiming on)
				</label>
				<label for="closeButton" class="flex items-center gap-3 text-base">
					<input
						type="checkbox"
						id="closeButton"
						class="form-checkbox"
						bind:checked={settings.closeButton}
					/>
					Close
				</label>
			</div>
			<label for="archive" class="flex items-start gap-3 font-medium">
				<input
					type="checkbox"
					id="archive"
					class="form-checkbox mt-1"
					bind:checked={settings.archive}
				/>
				<span>
					Archive messages
					<Hint>Save ticket messages so transcripts can be viewed after the ticket closes.</Hint>
				</span>
			</label>
			<label class="font-medium">
				Ticket number offset
				<input
					type="number"
					min="0"
					max="1000000000"
					step="1"
					class="input form-input"
					bind:value={settings.ticketNumberOffset}
				/>
				<Hint
					>Start numbering from here, e.g. when moving from another bot. Numbers never go backwards.</Hint
				>
			</label>
			<label class="font-medium">
				Blocklist
				<select
					multiple
					class="input form-multiselect h-36 font-normal"
					bind:value={settings.blocklist}
				>
					{#each roles as role}
						<option value={role.id} class="m-1 rounded p-1" style={role._style}>
							{role.unicodeEmoji || ''}
							{role.name}
						</option>
					{/each}
				</select>
				<Hint>Members with these roles can't open tickets. Hold Ctrl or ⌘ to select several.</Hint>
			</label>
		</Section>

		<Section id="automation" title="Reminders and auto-close" icon="fa-solid fa-clock">
			<label class="font-medium">
				Stale after
				<input
					type="text"
					class="input form-input"
					placeholder="e.g. 2d (blank turns it off)"
					bind:value={settings.staleAfter}
				/>
				<Hint>Remind members and staff when a ticket has had no reply for this long.</Hint>
			</label>
			<label class="font-medium">
				Auto close after
				<input
					type="text"
					class="input form-input"
					placeholder="e.g. 12h (blank turns it off)"
					bind:value={settings.autoClose}
				/>
				<Hint>Close stale tickets and unanswered close requests after this long.</Hint>
			</label>
			<label for="ghostPing" class="flex items-start gap-3 font-medium">
				<input
					type="checkbox"
					id="ghostPing"
					class="form-checkbox mt-1"
					bind:checked={settings.ghostPing}
				/>
				<span>
					Ghost ping
					<Hint>
						When staff reply and the creator has been quiet for 5 minutes, ping them and delete the
						ping straight away (once until they reply).
					</Hint>
				</span>
			</label>
		</Section>

		<Section
			id="working-hours"
			title="Working hours and holidays"
			icon="fa-solid fa-business-time"
			description="Shown in the opening message so members know when to expect a reply. Leave a day empty for a day off."
		>
			<label class="font-medium">
				Timezone
				<Required />
				<input
					type="text"
					list="timezones"
					class="input form-input"
					required
					bind:value={settings.workingHours[0]}
				/>
				<datalist id="timezones">
					{#each zones as zone}
						<option value={zone}></option>
					{/each}
				</datalist>
			</label>
			<div class="grid grid-cols-1 gap-2">
				{#each days as day, index}
					<div class="grid grid-cols-[6rem,1fr,auto,1fr] items-center gap-2">
						<span class="font-medium">{day}</span>
						<input
							type="time"
							aria-label="{day} start"
							class="form-input rounded-md border-transparent bg-gray-100 text-center shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800"
							bind:value={settings.workingHours[index + 1][0]}
						/>
						<i class="fa-solid fa-arrow-right-long text-gray-400"></i>
						<input
							type="time"
							aria-label="{day} end"
							class="form-input rounded-md border-transparent bg-gray-100 text-center shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800"
							bind:value={settings.workingHours[index + 1][1]}
						/>
					</div>
				{/each}
			</div>
			<div>
				<p class="font-medium">Holidays</p>
				<Hint
					>Whole days off in the timezone above. The opening message says when staff are back.</Hint
				>
				<div class="mt-2"><HolidayPicker bind:value={settings.holidays} /></div>
			</div>
		</Section>

		<Section id="appearance" title="Language and appearance" icon="fa-solid fa-palette">
			<label class="font-medium">
				Language
				<select class="input form-multiselect" bind:value={settings.locale}>
					{#each locales as locale}
						<option value={locale}>{locale}</option>
					{/each}
				</select>
			</label>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<label class="font-medium">
					Primary colour
					<input type="text" class="input form-input" bind:value={settings.primaryColour} />
				</label>
				<label class="font-medium">
					Success colour
					<input type="text" class="input form-input" bind:value={settings.successColour} />
				</label>
				<label class="font-medium">
					Error colour
					<input type="text" class="input form-input" bind:value={settings.errorColour} />
				</label>
			</div>
			<Hint>Colours can be hex (#5865F2) or a Discord colour name (Blurple, Red, …).</Hint>
			<label for="componentsV2" class="flex items-start gap-3 font-medium">
				<input
					type="checkbox"
					id="componentsV2"
					class="form-checkbox mt-1"
					bind:checked={settings.componentsV2}
				/>
				<span>
					Use Discord's new message layout
					<Hint
						>Opening messages and panels use Discord's newer layout components instead of embeds.
						Panels sent this way can't be changed back into embed panels later.</Hint
					>
				</span>
			</label>
			<label class="font-medium">
				Footer
				<input type="text" class="input form-input" maxlength="2048" bind:value={settings.footer} />
				<Hint>Text at the bottom of the bot's embeds.</Hint>
			</label>
		</Section>

		<Section id="channels" title="Channels" icon="fa-solid fa-hashtag">
			<label class="font-medium">
				Log channel
				<select class="input form-multiselect" bind:value={settings.logChannel}>
					<option value="">None</option>
					{#each channels as channel}
						<option value={channel.id}>#{channel.name}</option>
					{/each}
				</select>
				<Hint>Where the bot logs ticket and settings changes.</Hint>
			</label>
			<label class="font-medium">
				Auto tag
				<select class="input form-multiselect block font-normal" bind:value={autoTag}>
					<option value="custom">Specific channels</option>
					<option value="ticket">Only ticket channels</option>
					<option value="!ticket">All non-ticket channels</option>
					<option value="all">All channels</option>
				</select>
				<Hint>Where the bot replies automatically when a message matches a tag.</Hint>
			</label>
			{#if autoTag === 'custom'}
				<label class="font-medium">
					Auto tag channels
					<select
						multiple
						class="input form-multiselect h-36 font-normal"
						bind:value={settings.autoTag}
					>
						{#each channels as channel}
							<option value={channel.id} class="m-1 rounded p-1">#{channel.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		</Section>

		<Section
			id="webhook"
			title="Webhook"
			icon="fa-solid fa-plug"
			description="The bot sends a JSON POST here when a ticket is opened or closed."
		>
			<label class="font-medium">
				URL
				<input
					type="url"
					inputmode="url"
					placeholder="https://example.com/tickets"
					autocomplete="off"
					class="input form-input"
					bind:value={settings.webhookUrl}
				/>
				<Hint>Must be HTTPS. Leave blank to turn webhooks off.</Hint>
			</label>
			<label class="font-medium">
				Secret
				<input
					type="password"
					autocomplete="new-password"
					placeholder={hadWebhookSecret ? 'Saved (hidden). Type to replace it' : 'Optional'}
					disabled={removeWebhookSecret}
					class="input form-input"
					bind:value={webhookSecret}
				/>
				<Hint
					>With a secret, the body is signed with HMAC-SHA256 in the X-Signature-256 header.</Hint
				>
			</label>
			{#if hadWebhookSecret}
				<label for="removeWebhookSecret" class="flex items-center gap-3 text-base">
					<input
						type="checkbox"
						id="removeWebhookSecret"
						class="form-checkbox"
						bind:checked={removeWebhookSecret}
					/>
					Remove the saved secret
				</label>
			{/if}
		</Section>

		<SaveBar {modified} {loading} {saved} />
	</form>
</div>
