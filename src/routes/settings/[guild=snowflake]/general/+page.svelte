<script>
	import { page } from '$app/stores';
	import WorkingHours from '$components/settings/WorkingHours.svelte';
	import ButtonCustomiser from '$components/settings/ButtonCustomiser.svelte';
	import RoleSelect from '$components/settings/RoleSelect.svelte';
	import HolidayPicker from '$components/settings/HolidayPicker.svelte';
	import Section from '$components/settings/Section.svelte';
	import Hint from '$components/settings/Hint.svelte';
	import SaveBar from '$components/settings/SaveBar.svelte';
	import {
		LOG_EVENTS,
		WEBHOOK_SECRET_MASK,
		buttonRolesToForm,
		buttonsFromForm,
		buttonsToForm,
		durationToInput,
		inputToDuration,
		normaliseHolidays,
		parseWebhookUrl,
		webhookSecretPayload,
		workingHoursFromForm,
		workingHoursToForm
	} from '$lib/util/settings';
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

	channels = channels.filter((c) => c.type === 0); // text
	roles = roles.filter((r) => r.name !== '@everyone').sort((a, b) => b.rawPosition - a.rawPosition);
	roles.forEach((r) => {
		r._hexColor = r.color > 0 ? `#${r.color.toString(16).padStart(6, '0')}` : null;
		r._style = r._hexColor ? `color: ${r._hexColor}` : '';
	});
	settings.autoClose = durationToInput(settings.autoClose);
	settings.logChannel = settings.logChannel ?? '';
	settings.transcriptChannel = settings.transcriptChannel ?? '';
	settings.transcriptDm ??= false;
	settings.logExclude = [...(settings.logExclude ?? [])];
	settings.staleAfter = durationToInput(settings.staleAfter);
	settings.workingHours = workingHoursToForm(settings.workingHours);
	settings.holidays = normaliseHolidays(settings.holidays);
	settings.closeRequests ??= true;
	settings.ghostPing ??= false;
	settings.ticketNumberOffset ??= 0;
	settings.webhookUrl ??= '';
	// Ticket Tool parity, P2 (bot PR #31)
	let buttonAccess = $state(buttonRolesToForm(settings.buttons));
	settings.buttons = buttonsToForm(settings.buttons);
	// Ticket Tool parity, P3 (bot PR #32): members with these roles can use the dashboard without Manage Server
	settings.dashboardRoles = [...(settings.dashboardRoles ?? [])];
	const viaDashboardRole = data.guild?.viaDashboardRole === true;
	settings.moveRelease ??= false;
	settings.moveResend ??= false;
	settings.userLimit ??= 0;

	// the bot never sends the secret back, only a mask when one is set
	let hadWebhookSecret = $state(settings.webhookSecret === WEBHOOK_SECRET_MASK);
	let webhookSecret = $state('');
	let removeWebhookSecret = $state(false);

	let autoTag = $state(Array.isArray(settings.autoTag) ? 'custom' : settings.autoTag); // there are 2 inputs for autoTag, need separate variables
	let error = $state(null);
	let loading = $state(false);
	let saved = $state(false);
	// the layout setting as last saved (not the unsaved checkbox), so admins can see it took effect
	let savedComponentsV2 = $state(settings.componentsV2 === true);

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
			if (settings.transcriptChannel === '') json.transcriptChannel = null;
			json.workingHours = workingHoursFromForm(settings.workingHours);
			json.buttons = buttonsFromForm(settings.buttons, buttonAccess);
			json.userLimit = Math.max(0, Math.min(100, Number(settings.userLimit) || 0));

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
				savedComponentsV2 = body.componentsV2 === true;
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
			<label class="font-medium">
				Open tickets per member
				<input
					type="number"
					min="0"
					max="100"
					step="1"
					class="input form-input"
					bind:value={settings.userLimit}
				/>
				<Hint
					>Across all categories. 0 means no server-wide limit (category limits still apply).</Hint
				>
			</label>
			<div class="flex flex-col gap-2">
				<p class="font-medium">When staff move a ticket with /move</p>
				<label for="moveRelease" class="flex items-center gap-3 text-base">
					<input
						type="checkbox"
						id="moveRelease"
						class="form-checkbox"
						bind:checked={settings.moveRelease}
					/>
					Release the claim
				</label>
				<label for="moveResend" class="flex items-center gap-3 text-base">
					<input
						type="checkbox"
						id="moveResend"
						class="form-checkbox"
						bind:checked={settings.moveResend}
					/>
					Send the new category's opening message again
				</label>
			</div>
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
			<WorkingHours bind:value={settings.workingHours} />
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
					<p class="mt-1 text-sm font-normal" data-testid="layout-status">
						{#if savedComponentsV2}
							<span class="text-green-600 dark:text-green-400"
								><i class="fa-solid fa-circle-check"></i> On for this server.</span
							>
							New tickets and new panels use it. To switch a panel you already sent,
							<a href="../panels" class="text-blurple hover:underline"
								>update it on the Panels page</a
							>.
						{:else}
							<span class="text-gray-500 dark:text-slate-400"
								>Off: the bot uses classic embeds.</span
							>
						{/if}
					</p>
				</span>
			</label>
			<label class="font-medium">
				Footer
				<input type="text" class="input form-input" maxlength="2048" bind:value={settings.footer} />
				<Hint>Text at the bottom of the bot's embeds.</Hint>
			</label>
		</Section>

		<Section
			id="buttons"
			title="Buttons"
			icon="fa-solid fa-hand-pointer"
			description="Change the label, emoji and colour of the bot's buttons. Leave a box empty to keep the default."
		>
			<ButtonCustomiser {roles} bind:value={settings.buttons} bind:access={buttonAccess} />
			<Hint
				>Emoji can be a unicode emoji, a name like :tickets:, or a custom emoji like
				&lt;:name:123456789012345678&gt;. Members with Manage Server can always use every button.</Hint
			>
		</Section>

		<Section
			id="dashboard"
			title="Dashboard access"
			icon="fa-solid fa-user-gear"
			description="Members with these roles can change this server's settings here without the Manage Server permission. They can't export or import the server, or change this list."
		>
			<label class="font-medium">
				Dashboard roles
				<RoleSelect
					{roles}
					label="Dashboard roles"
					size="h-36"
					disabled={viaDashboardRole}
					bind:value={settings.dashboardRoles}
				/>
				{#if viaDashboardRole}
					<Hint>Only members with Manage Server can change this.</Hint>
				{:else}
					<Hint
						>Only give these to people you'd trust as admins: they can change staff roles and see
						every ticket's transcript.</Hint
					>
				{/if}
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
			{#if settings.logChannel}
				<fieldset>
					<legend class="font-medium">Logged events</legend>
					<div class="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
						{#each LOG_EVENTS as [event, label] (event)}
							<label class="flex items-center gap-2 font-normal">
								<input
									type="checkbox"
									class="form-checkbox"
									checked={!settings.logExclude.includes(event)}
									onchange={(e) => {
										settings.logExclude = e.currentTarget.checked
											? settings.logExclude.filter((x) => x !== event)
											: [...settings.logExclude, event];
									}}
								/>
								{label}
							</label>
						{/each}
					</div>
					<Hint
						>Unticked events aren't posted to the log channel. The bot's own log still has them.</Hint
					>
				</fieldset>
			{/if}
			<label class="font-medium">
				Transcript channel
				<select class="input form-multiselect" bind:value={settings.transcriptChannel}>
					<option value="">None</option>
					{#each channels as channel}
						<option value={channel.id}>#{channel.name}</option>
					{/each}
				</select>
				<Hint
					>When a ticket closes, its transcript (an HTML file) is posted here. Needs archiving.</Hint
				>
			</label>
			<label for="transcriptDm" class="flex items-start gap-3 font-medium">
				<input
					type="checkbox"
					id="transcriptDm"
					class="form-checkbox mt-1"
					bind:checked={settings.transcriptDm}
				/>
				<span>
					Send the transcript to the member
					<Hint
						>Attach the transcript file to the message the member gets when their ticket closes.</Hint
					>
				</span>
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
