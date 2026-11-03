<script>
	import { run, preventDefault } from 'svelte/legacy';

	import ms from 'ms';
	import emoji from 'emoji-name-map';
	import { escapeHTML, renderMarkdown } from '$lib/util/markdown';
	import { v4 as uuidv4 } from 'uuid';
	import CategoryQuestions from '$components/CategoryQuestions/Questions.svelte';
	import { questionsState as qS } from '$components/state.svelte';
	import Required from '$components/Required.svelte';
	import Help from '$components/settings/Help.svelte';
	import Hint from '$components/settings/Hint.svelte';
	import Section from '$components/settings/Section.svelte';
	import RoleSelect from '$components/settings/RoleSelect.svelte';
	import RoleLimits from '$components/settings/RoleLimits.svelte';
	import PingRoleRules from '$components/settings/PingRoleRules.svelte';
	import OverrideSelect from '$components/settings/OverrideSelect.svelte';
	import {
		cleanPingRoleRules,
		cleanRoleLimits,
		durationToInput,
		inputToDuration
	} from '$lib/util/settings';
	import { getContext, onMount } from 'svelte';
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

	onMount(async () => {
		const { applyPolyfills, defineCustomElements } = await import(
			'@skyra/discord-components-core/loader'
		);
		applyPolyfills().then(() => {
			defineCustomElements();
		});

		window.addEventListener('beforeunload', (event) => {
			if (modified) {
				event.preventDefault();
				event.returnValue = '';
			}
		});
	});

	let { category, channels, roles, url } = $state(data);

	const slowmodes = [
		'5s',
		'10s',
		'15s',
		'30s',
		'1m',
		'2m',
		'5m',
		'10m',
		'15m',
		'30m',
		'1h',
		'2h',
		'6h'
	];

	qS.questions = category.questions;
	channels = channels.filter((c) => c.type === 4); // category
	roles = roles.filter((r) => r.name !== '@everyone').sort((a, b) => b.rawPosition - a.rawPosition);
	roles.forEach((r) => {
		r._hexColor = r.color > 0 ? `#${r.color.toString(16).padStart(6, '0')}` : null;
		r._style = r._hexColor ? `color: ${r._hexColor}` : '';
	});

	category.cooldown = durationToInput(category.cooldown);
	// per-category overrides: null = use the server setting, 0 = off
	category.autoClose = durationToInput(category.autoClose, { allowOff: true });
	category.staleAfter = durationToInput(category.staleAfter, { allowOff: true });
	category.archive ??= null;
	category.claimButton ??= null;
	category.closeButton ??= null;
	category.blockedRoles ??= [];
	category.fallbackCategories ??= [];
	category.pingRoleRules = (category.pingRoleRules ?? []).map((r) => ({
		roles: [...(r.roles ?? [])],
		ping: [...(r.ping ?? [])]
	}));
	category.roleLimits = (category.roleLimits ?? []).map((r) => ({ ...r }));
	const serverSettings = data.settings ?? {};
	let showAdvanced = $state(
		category.roleLimits.length > 0 ||
			category.pingRoleRules.length > 0 ||
			category.fallbackCategories.length > 0 ||
			category.blockedRoles.length > 0 ||
			[category.archive, category.claimButton, category.closeButton].some((v) => v !== null) ||
			category.autoClose !== '' ||
			category.staleAfter !== ''
	);

	let error = $state(null);
	let loadingSubmit = $state(false);
	let loadingDelete = $state(false);

	const submit = async () => {
		try {
			// error = null;
			loadingSubmit = true;
			const json = { ...category };

			if (category.discordCategory === 'new') json.discordCategory = null;
			json.cooldown = inputToDuration(category.cooldown, { field: 'Cooldown' });
			json.autoClose = inputToDuration(category.autoClose, {
				allowOff: true,
				field: 'Auto close after'
			});
			json.staleAfter = inputToDuration(category.staleAfter, {
				allowOff: true,
				field: 'Stale after'
			});
			json.roleLimits = cleanRoleLimits(category.roleLimits);
			json.pingRoleRules = cleanPingRoleRules(category.pingRoleRules);
			json.fallbackCategories = category.fallbackCategories.filter(
				(id) => id !== category.discordCategory
			);

			if (json.name.length > 30) throw new Error(`The name is too long (${json.name.length}>30).`);

			if (json.description.length > 100)
				throw new Error(`The description is too long (${json.description.length}>100).`);

			json.questions = qS.questions.map((q) => {
				if (q.type === 'TEXT') {
					if (q.value.length > 0 && q.value.length < q.minLength)
						throw `The value of the "${q.label}" question is shorter than the minimum length.`;
					if (q.value.length > q.maxLength)
						throw `The value of the "${q.label}" question is longer than the maximum length.`;
				}
				delete q._real;
				return q;
			});

			if (json.questions.find((q) => q.id === json.customTopic) === undefined)
				json.customTopic = null;

			const response = await fetch(url, {
				method: category.id ? 'PATCH' : 'POST',
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
				window.location = './';
			}
		} catch (err) {
			loadingSubmit = false;
			error = err;
			window.scroll({
				top: 0,
				behavior: 'smooth'
			});
		}
	};

	const del = async () => {
		try {
			const confirmed = confirm(
				'Are you sure?\nThis will delete all associated tickets (including messages, feedback, etc).'
			);
			if (!confirmed) return false;
			// error = null;
			loadingDelete = true;

			const response = await fetch(url, {
				method: 'DELETE',
				credentials: 'include'
			});
			const body = await response.json();

			if (!response.ok) throw body;
			else window.location = './';
		} catch (err) {
			loadingDelete = false;
			error = err;
			window.scroll({
				top: 0,
				behavior: 'smooth'
			});
		}
	};

	const getRole = (id) => roles.find((r) => r.id === id);

	run(() => {
		category.customTopic = qS.questions.find((q) => q.id === category.customTopic)
			? category.customTopic
			: null;
	});
	// TODO: migrate
	run(() => {
		category.requireTopic = qS.questions.length > 0 ? false : category.requireTopic;
	});
</script>

<div class="mx-auto max-w-5xl px-4">
	<a href="./" class="text-sm text-gray-500 hover:text-blurple dark:text-slate-400"
		><i class="fa-solid fa-arrow-left"></i> Categories</a
	>
	<h1 class="mt-1 text-3xl font-bold">
		{emoji.get(category.emoji) ?? ''}
		{category.name || 'New category'}
	</h1>
	<p class="text-gray-500 dark:text-slate-400">
		<a
			href="https://discordtickets.app/configuration/categories"
			target="_blank"
			rel="noopener noreferrer"
			class="text-blurple hover:underline">Documentation</a
		>
	</p>
</div>
<div class="m-2 mx-auto max-w-5xl p-4 text-lg">
	{#if error}
		<ErrorBox {error} />
	{/if}
	<form onsubmit={preventDefault(() => submit())} onchange={() => (modified = true)} class="my-4">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
			<div class="flex flex-col gap-6">
				<Section
					id="basics"
					title="Basics"
					icon="fa-solid fa-circle-info"
					description="How the category appears in panels and menus."
				>
					<div>
						<label class="font-medium">
							Name
							<Required />
							<input type="text" class="input form-input" required bind:value={category.name} />
							<Hint>The name of the category</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Description
							<Required />
							<input
								type="text"
								class="input form-input"
								required
								bind:value={category.description}
							/>
							<Hint>What is this category for?</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Emoji
							<Required />
							<span class="text-2xl">{emoji.get(category.emoji) ?? ''}</span>
							<input type="text" class="input form-input" required bind:value={category.emoji} />
							<Hint>Emoji used for buttons & dropdowns</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Image
							<input type="url" class="input form-input" bind:value={category.image} />
							<Hint>A link to an image to be sent with the opening message.</Hint>
						</label>
					</div>
				</Section>
				<Section id="channels" title="Ticket channels" icon="fa-solid fa-hashtag">
					<div>
						<label class="font-medium">
							Discord category
							<Required />
							<select class="input form-multiselect" required bind:value={category.discordCategory}>
								{#if !category.discordCategory || category.discordCategory === 'new'}
									<option value="new">Create a new category</option>
									<hr />
								{/if}
								{#each channels as channel}
									<option value={channel.id} class="p-1">
										<!-- <i class="fa-solid fa-hashtag text-gray-500 dark:text-slate-400" /> -->
										{channel.name}
									</option>
								{/each}
							</select>
							<Hint>Which category channel should ticket channels be created under?</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Channel name
							{#if category.id}
								<Required />
							{/if}
							<input
								type="text"
								class="input form-input"
								placeholder="ticket-{'{'}num{'}'}"
								required={!!category.id}
								bind:value={category.channelName}
							/>
							<Hint>The name of ticket channels</Hint>
						</label>
						{#if category.channelName}
							<p class="mb-1 mt-2 text-sm font-semibold">Preview</p>
							<div
								class="block w-full break-words rounded-md bg-blurple/20 p-3 font-mono text-sm shadow-sm dark:bg-blurple/20"
							>
								<i class="fa-solid fa-hashtag text-gray-500 dark:text-slate-400"></i>
								<span class="marked">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
									{@html renderMarkdown(category.channelName.replace(/\n/g, '\n\n'), [
										[/{+\s?num(ber)?\s?}+/gi, 1],
										[/{+\s?(nick|display)(name)?\s?}+/gi, getContext('user').username],
										[/{+\s?(user)?name\s?}+/gi, getContext('user').username]
									])}
								</span>
							</div>
						{/if}
					</div>
					<div>
						<label class="font-medium">
							Slow mode
							<select class="input form-multiselect font-normal" bind:value={category.ratelimit}>
								<option value={null} class="p-1">
									<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" /> -->
									Off
								</option>
								{#each slowmodes as slowmode}
									<option value={ms(slowmode) / 1000} class="p-1">
										<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" /> -->
										{slowmode}
									</option>
								{/each}
							</select>
							<Hint>Should slow mode be enabled?</Hint>
						</label>
					</div>
				</Section>
				<Section id="access" title="Access and pings" icon="fa-solid fa-user-shield">
					<div>
						<label class="font-medium">
							Staff roles
							<Required />
							<select
								multiple
								required
								class="input form-multiselect h-44 font-normal"
								bind:value={category.staffRoles}
							>
								{#each roles as role}
									<option value={role.id} class="m-1 rounded p-1" style={role._style}>
										<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" style={role._style} /> -->
										{role.unicodeEmoji || ''}
										{role.name}
									</option>
								{/each}
							</select>
							<Hint>Roles that will be able to view tickets.</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Required roles
							<select
								multiple
								class="input form-multiselect h-44 font-normal"
								bind:value={category.requiredRoles}
							>
								{#each roles as role}
									<option value={role.id} class="m-1 rounded p-1" style={role._style}>
										<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" style={role._style} /> -->
										{role.unicodeEmoji || ''}
										{role.name}
									</option>
								{/each}
							</select>
							<Hint>Roles that a user needs to create a ticket.</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Ping roles
							<select
								multiple
								class="input form-multiselect h-44 font-normal"
								bind:value={category.pingRoles}
							>
								{#each roles as role}
									<option value={role.id} class="m-1 rounded p-1" style={role._style}>
										<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" style={role._style} /> -->
										{role.unicodeEmoji || ''}
										{role.name}
									</option>
								{/each}
							</select>
							<Hint>Roles that should be pinged upon ticket creation.</Hint>
						</label>
					</div>
				</Section>
				<Section id="opening" title="Opening message" icon="fa-solid fa-message">
					<div>
						<label class="font-medium">
							Opening message
							<Required />
							<textarea
								class="input form-input"
								required
								rows="4"
								maxlength="1000"
								bind:value={category.openingMessage}
							></textarea>
							<Hint>Content to be sent in the opening message of each ticket.</Hint>
						</label>
						{#key category.pingRoles}
							{#key category.requireTopic}
								{#if category.openingMessage}
									<p class="mb-1 mt-2 text-sm font-semibold">Preview</p>
									<discord-messages
										no-background={true}
										light-theme={data.theme !== 'dark'}
										class="bloc w-full border-0"
									>
										<discord-message
											author={data.client.username}
											avatar={data.client.avatar}
											bot={true}
											timestamp={`Today at ${new Date().toLocaleTimeString('default', {
												hour: 'numeric',
												minute: 'numeric'
											})}`}
											class="py-2"
											highlight
										>
											{#if category.pingRoles?.length > 0}
												{#each category.pingRoles as id, index}
													{@const role = getRole(id)}
													{#if role}
														{#if index > 0}
															{' '}
														{/if}
														<discord-mention color={role?._hexColor} type="role">
															{role?.name}
														</discord-mention>
													{/if}
												{/each}
												, <br />
											{/if}
											<discord-mention highlight>{data.user.username}</discord-mention>
											has created a new ticket
											<discord-embed
												slot="embeds"
												color={data.settings.primaryColour}
												author-image={`https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.webp`}
												author-name={data.user.username}
												image={category.image}
											>
												<discord-embed-description
													slot="description"
													class="prose prose-sm prose-slate break-words dark:prose-invert prose-a:text-blurple"
												>
													<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by renderMarkdown -->
													{@html renderMarkdown(category.openingMessage, [
														[
															/{+\s?(user)?name\s?}+/gi,
															`<discord-mention>${escapeHTML(data.user.username)}</discord-mention>`,
															{ html: true }
														],
														[/{+\s?avgResponseTime\s?}+/gi, data.guild.stats.avgResponseTime],
														[/{+\s?avgResolutionTime\s?}+/gi, data.guild.stats.avgResolutionTime]
													])}
												</discord-embed-description>
												{#if category.requireTopic}
													<discord-embed-fields slot="fields">
														<discord-embed-field field-title="Topic">
															This is a pretty good preview
														</discord-embed-field>
													</discord-embed-fields>
												{/if}
												{#if data.settings.footer}
													<discord-embed-footer slot="footer" footer-image={data.client.avatar}>
														{data.settings.footer}
													</discord-embed-footer>
												{/if}
											</discord-embed>
											<discord-attachments slot="components">
												<discord-action-row>
													{#if category.requireTopic || qS.questions.length > 0}
														<discord-button type="secondary">✏️ Edit</discord-button>
													{/if}
													{#if category.claiming && data.settings.claimButton}
														<discord-button type="secondary">🙌 Claim</discord-button>
													{/if}
													{#if data.settings.closeButton}
														<discord-button type="destructive">✖️ Close</discord-button>
													{/if}
												</discord-action-row>
											</discord-attachments>
										</discord-message>
									</discord-messages>
								{/if}
							{/key}
						{/key}
					</div>
					<div>
						<label for="requireTopic" class="font-medium">
							Require topic
							<input
								type="checkbox"
								id="requireTopic"
								name="requireTopic"
								class="form-checkbox"
								disabled={qS.questions.length > 0}
								bind:checked={category.requireTopic}
							/>
							<Hint>Require a topic before ticket creation?</Hint>
						</label>
					</div>
				</Section>
				<Section id="limits" title="Limits" icon="fa-solid fa-gauge">
					<div>
						<label class="font-medium">
							Member limit
							<input
								type="number"
								min="1"
								max="10"
								class="input form-input"
								bind:value={category.memberLimit}
							/>
							<Hint>How many tickets in this category can each member have open?</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Total limit
							<input
								type="number"
								min="1"
								max="50"
								class="input form-input"
								bind:value={category.totalLimit}
							/>
							<Hint>The total number of tickets that can be open at once.</Hint>
						</label>
					</div>
					<div>
						<label class="font-medium">
							Cooldown
							<input type="text" class="input form-input" bind:value={category.cooldown} />
							<Hint>How long should members have to wait before creating another ticket?</Hint>
						</label>
					</div>
				</Section>
				<Section id="features" title="Features" icon="fa-solid fa-toggle-on">
					<div>
						<label for="anonymous" class="font-medium">
							Anonymous staff
							<input
								type="checkbox"
								id="anonymous"
								name="anonymous"
								class="form-checkbox"
								bind:checked={category.anonymous}
							/>
							<Hint
								>Staff replies are posted by the bot as "Staff", so members can't see which staff
								member answered.</Hint
							>
						</label>
					</div>
					<div>
						<label for="claiming" class="font-medium">
							Claiming
							<input
								type="checkbox"
								id="claiming"
								name="claiming"
								class="form-checkbox"
								bind:checked={category.claiming}
							/>
							<Hint>Allow staff to claim tickets?</Hint>
						</label>
					</div>
					<div>
						<label for="enableFeedback" class="font-medium">
							Feedback
							<input
								type="checkbox"
								id="enableFeedback"
								name="enableFeedback"
								class="form-checkbox"
								bind:checked={category.enableFeedback}
							/>
							<Hint>Gather feedback from members?</Hint>
						</label>
					</div>
				</Section>
				<details
					class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-700"
					bind:open={showAdvanced}
				>
					<summary class="cursor-pointer select-none text-xl font-bold">More options</summary>
					<div class="mt-4 grid grid-cols-1 gap-8">
						<div>
							<p class="font-medium">
								Role limits
								<Help
									text="Let members with these roles have a different number of open tickets than the member limit. If a member has several, the highest limit wins."
								/>
							</p>
							<RoleLimits {roles} bind:value={category.roleLimits} />
						</div>
						<div>
							<p class="font-medium">
								Ping rules
								<Help
									text="Ping different roles depending on who opens the ticket. The first rule whose roles the creator has replaces the ping roles above."
								/>
							</p>
							<PingRoleRules {roles} bind:value={category.pingRoleRules} />
						</div>
						<div>
							<label class="font-medium">
								Fallback categories
								<Help
									text="Discord categories hold at most 50 channels. When the main one is full, new tickets go in these, in order."
								/>
								<select
									multiple
									class="input form-multiselect h-32 font-normal"
									bind:value={category.fallbackCategories}
								>
									{#each channels.filter((c) => c.id !== category.discordCategory) as channel (channel.id)}
										<option value={channel.id} class="p-1">{channel.name}</option>
									{/each}
								</select>
							</label>
						</div>
						<div>
							<label class="font-medium">
								Blocked roles
								<Help
									text="Members with any of these roles can't open tickets in this category (on top of the server blocklist)."
								/>
								<RoleSelect {roles} label="Blocked roles" bind:value={category.blockedRoles} />
							</label>
						</div>
						<fieldset class="grid grid-cols-1 gap-4">
							<legend class="mb-2 font-medium">
								Server setting overrides
								<Help
									text="Change these for this category only. Leave them on the server setting to follow General settings."
								/>
							</legend>
							<label class="text-base font-medium">
								Archive messages
								<OverrideSelect
									label="Archive messages"
									serverValue={serverSettings.archive}
									bind:value={category.archive}
								/>
							</label>
							<label class="text-base font-medium">
								Claim button
								<OverrideSelect
									label="Claim button"
									serverValue={serverSettings.claimButton}
									bind:value={category.claimButton}
								/>
							</label>
							<label class="text-base font-medium">
								Close button
								<OverrideSelect
									label="Close button"
									serverValue={serverSettings.closeButton}
									bind:value={category.closeButton}
								/>
							</label>
							<label class="text-base font-medium">
								Stale after
								<input
									type="text"
									class="input form-input"
									placeholder="Server setting. Use e.g. 2d, or off"
									bind:value={category.staleAfter}
								/>
							</label>
							<label class="text-base font-medium">
								Auto close after
								<input
									type="text"
									class="input form-input"
									placeholder="Server setting. Use e.g. 12h, or off"
									bind:value={category.autoClose}
								/>
							</label>
						</fieldset>
					</div>
				</details>
			</div>
			<div>
				<div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-700">
					<div class="flex flex-col gap-4">
						<div class="text-center">
							<h3 class="text-xl font-bold">Questions</h3>
							<p class="text-gray-500 dark:text-slate-400">{qS.questions.length}/5</p>
						</div>
						{#if qS.questions.length > 0}
							<div>
								<label class="font-medium">
									Custom topic
									<i
										class="fa-solid fa-circle-question cursor-help text-gray-500 dark:text-slate-400"
										title="Which question's value should be used as the ticket topic?"
									></i>
									<select
										class="input form-multiselect font-normal"
										bind:value={category.customTopic}
									>
										<option value={null} class="p-1">
											<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" /> -->
											None
										</option>
										<hr />
										{#each qS.questions as q}
											<option value={q.id} class="p-1">
												<!-- <i class="fa-solid fa-at text-gray-500 dark:text-slate-400" /> -->
												{q.label}
											</option>
										{/each}
									</select>
								</label>
							</div>
						{/if}
						<div>
							<CategoryQuestions />
						</div>
						{#if qS.questions.length < 5}
							<div class="text-center">
								<button
									type="button"
									class="rounded-lg p-2 px-5 font-medium text-green-500 transition duration-300 hover:text-green-300 disabled:cursor-not-allowed dark:text-green-500 dark:hover:text-green-500/50"
									onclick={() => {
										qS.questions.push({
											id: uuidv4(),
											label: `Question ${qS.questions.length + 1}`,
											maxLength: 1000,
											minLength: 0,
											options: [],
											order: qS.questions.length,
											placeholder: '',
											required: true,
											style: 2,
											type: null,
											value: '',
											_real: false
										});
									}}
								>
									<i class="fa-solid fa-circle-plus"></i>
									Add
								</button>
							</div>
						{/if}
					</div>
				</div>
				<div class="flex justify-end gap-4">
					{#if category.id}
						<button
							type="button"
							disabled={loadingDelete}
							class="mt-4 rounded-lg bg-red-300 p-2 px-5 font-medium transition duration-300 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed dark:bg-red-500/50 dark:hover:bg-red-500 dark:hover:text-white"
							onclick={del}
						>
							{#if loadingDelete}
								<i class="fa-solid fa-spinner animate-spin"></i>
							{:else}
								<i class="fa-solid fa-trash"></i>
							{/if}
							Delete
						</button>
					{/if}
					<button
						type="submit"
						disabled={loadingSubmit}
						class="mt-4 rounded-lg bg-green-300 p-2 px-5 font-medium transition duration-300 hover:bg-green-500 hover:text-white disabled:cursor-not-allowed dark:bg-green-500/50 dark:hover:bg-green-500 dark:hover:text-white"
					>
						{#if loadingSubmit}
							<i class="fa-solid fa-spinner animate-spin"></i>
						{/if}
						Save category
					</button>
				</div>
			</div>
		</div>
	</form>
</div>
