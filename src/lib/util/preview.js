/**
 * Message previews for the settings pages. These mirror how the bot builds the messages
 * (bot: src/lib/tickets/opening-message.js, src/lib/tickets/closed.js and src/lib/panel.js) so admins
 * see what members will see: classic embeds, Discord's new layout (Components V2), plain text, or off.
 *
 * The result is a plain "message model" rendered by components/settings/DiscordPreview.svelte. Text in it
 * is markdown from admins and members, and is only ever rendered through renderMarkdown (which escapes HTML).
 * Mentions are kept out of the markdown as tokens, so names can't inject HTML either.
 */

import emojiNames from 'emoji-name-map';

// mirrors the bot's limits
const TEXT_LIMIT = 2000;
const DETAILS_LIMIT = 1500;
const INTRO_LIMIT = 1800;

const truncate = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

/**
 * Replace `{num}`, `{number}` and `{num:4}` like the bot.
 * @param {string} template
 * @param {number} number
 */
export function replaceNumber(template, number) {
	return String(template ?? '').replace(/{+\s?num(?:ber)?(?::(\d{1,2}))?\s?}+/gi, (_, padding) =>
		String(number).padStart(Math.min(Number(padding) || 0, 10), '0')
	);
}

/**
 * A preview being built: text with mention tokens, and the mentions they stand for.
 */
class Mentions {
	constructor() {
		this.list = [];
	}

	/**
	 * @param {string} name shown after the @
	 * @param {{ color?: string | null, kind?: 'role' | 'user' | 'channel' }} [options]
	 * @returns {string} a token to put in markdown
	 */
	add(name, { color = null, kind = 'user' } = {}) {
		const token = `%%MENTION${this.list.length}%%`;
		this.list.push({ color, kind, name: String(name ?? ''), token });
		return token;
	}
}

/**
 * Fill in the opening message placeholders like the bot (`formatOpeningMessage`).
 * @param {string} template
 * @param {object} values
 * @param {string} values.creator a mention token
 * @param {string} values.displayName
 * @param {string} values.username
 * @param {{ name: string, description: string }} values.category
 * @param {string} values.topic
 * @param {object} [values.stats]
 */
export function formatOpeningMessage(
	template,
	{ creator, displayName, username, category, topic, stats = {} }
) {
	const values = {
		avgrating: stats.avgRating,
		avgresolutiontime: stats.avgResolutionTime,
		avgresponsetime: stats.avgResponseTime,
		category: category?.name,
		description: category?.description,
		displayname: displayName,
		mention: creator,
		name: creator,
		tag: username,
		topic,
		username: creator
	};
	return replaceNumber(template, 1).replace(/{+\s?([a-z]+)\s?}+/gi, (match, key) => {
		const value = values[key.toLowerCase()];
		return value === undefined || value === null ? match : String(value);
	});
}

/**
 * The buttons under an opening message, like the bot's `buildButtons`.
 * @param {{ edit?: boolean, claim?: 'claim' | 'unclaim' | null, close?: boolean }} options
 */
export function openingButtons({ edit = false, claim = null, close = false }) {
	const buttons = [];
	if (edit) buttons.push({ emoji: '✏️', label: 'Edit', style: 'secondary' });
	if (claim === 'claim') buttons.push({ emoji: '🙌', label: 'Claim', style: 'secondary' });
	if (claim === 'unclaim') buttons.push({ emoji: '♻️', label: 'Release', style: 'secondary' });
	if (close) buttons.push({ emoji: '✖️', label: 'Close', style: 'danger' });
	return buttons;
}

/**
 * @typedef {object} PreviewModel
 * @property {{ name: string, avatar?: string | null }} author the bot
 * @property {{ token: string, name: string, color: string | null, kind: string }[]} mentions
 * @property {string | null} content markdown above everything else
 * @property {object[]} embeds classic embeds
 * @property {object | null} container a Components V2 container
 * @property {object[]} rows action rows outside the container: `{ type: 'buttons', buttons }` or `{ type: 'menu', ... }`
 */

/**
 * Preview of a ticket's opening message.
 * @param {object} options
 * @param {'EMBED' | 'TEXT' | 'OFF'} [options.style]
 * @param {boolean} [options.v2] the server uses Discord's new layout
 * @param {string} [options.colour]
 * @param {{ name: string, avatar?: string | null }} options.bot
 * @param {{ name: string, avatar?: string | null }} options.creator
 * @param {{ name: string, color?: string | null }[]} [options.pingRoles] roles that would be pinged
 * @param {{ name: string, description?: string, image?: string | null, openingMessage?: string }} options.category
 * @param {{ name: string, value: string }[]} [options.fields] the topic or answers
 * @param {string | null} [options.footer]
 * @param {object[]} [options.buttons] from `openingButtons`
 * @param {object} [options.stats]
 * @returns {PreviewModel}
 */
export function openingMessagePreview({
	style = 'EMBED',
	v2 = false,
	colour = '#009999',
	bot,
	creator,
	pingRoles = [],
	category,
	fields = [],
	footer = null,
	buttons = [],
	stats = {}
}) {
	const mentions = new Mentions();
	const creatorToken = mentions.add(creator.name);
	const pings = pingRoles
		.map((r) => mentions.add(r.name, { color: r.color, kind: 'role' }))
		.join(' ');
	// the bot's "ticket.opening_message.content"
	const content = `${pings ? pings + ',\n' : ''}${creatorToken} has created a new ticket`;
	const description =
		formatOpeningMessage(category.openingMessage ?? '', {
			category,
			creator: creatorToken,
			displayName: creator.name,
			stats,
			topic: fields[0]?.value ?? '',
			username: creator.name
		}).trim() || null;
	const rows = buttons.length ? [{ buttons, type: 'buttons' }] : [];
	const base = { author: bot, container: null, embeds: [], mentions: mentions.list, rows };

	if (style === 'TEXT' || style === 'OFF') {
		const details = fields.length
			? truncate(fields.map((f) => `**${f.name}**\n${f.value}`).join('\n\n'), DETAILS_LIMIT)
			: '';
		const head =
			style === 'TEXT'
				? [content, `**${creator.name}**`, description, category.image].filter(Boolean).join('\n\n')
				: content;
		return {
			...base,
			content: truncate(head, TEXT_LIMIT - 3 - details.length) + (details ? '\n\n' + details : '')
		};
	}

	if (!v2) {
		const embeds = [
			{
				author: { icon: creator.avatar, name: creator.name },
				color: colour,
				description,
				image: category.image || null
			}
		];
		if (fields.length) embeds.push({ color: colour, fields });
		if (footer) embeds[embeds.length - 1].footer = { icon: bot.avatar, text: footer };
		return { ...base, content, embeds };
	}

	const children = [
		{
			markdown: truncate(
				`### ${creator.name}` + (description ? `\n${description}` : ''),
				INTRO_LIMIT
			),
			thumbnail: creator.avatar || null,
			type: 'text'
		}
	];
	if (category.image) children.push({ type: 'gallery', url: category.image });
	children.push({ type: 'separator' });
	children.push(
		fields.length
			? {
					markdown: truncate(
						fields.map((f) => `**${f.name}**\n${f.value}`).join('\n\n'),
						DETAILS_LIMIT
					),
					type: 'text'
				}
			: { text: '—', type: 'subtext' }
	);
	if (buttons.length) children.push({ buttons, type: 'buttons' });
	if (footer) children.push({ text: footer, type: 'subtext' });
	return { ...base, container: { accent: colour, children }, content, rows: [] };
}

/**
 * Preview of the message staff see in a kept channel when a ticket closes.
 * @param {object} options
 * @param {{ name: string, avatar?: string | null }} options.bot
 * @param {string} [options.colour]
 * @param {string} options.closedBy who closed it ("Staff" in anonymous categories)
 * @param {number | null} options.keepClosedFor milliseconds; 0 keeps it until deleted
 * @param {boolean} options.archive whether there's a transcript button
 * @param {string | null} [options.footer]
 * @returns {PreviewModel}
 */
export function closedMessagePreview({
	bot,
	colour = '#009999',
	closedBy,
	keepClosedFor,
	archive,
	footer = null
}) {
	const mentions = new Mentions();
	const closer = mentions.add(closedBy);
	let description = `${closer} closed this ticket.\nStaff can reopen it, save a transcript, or delete the channel.`;
	if (keepClosedFor > 0)
		description += `\nThis channel will be deleted in ${formatDuration(keepClosedFor)}.`;
	const buttons = [{ emoji: '🔓', label: 'Reopen', style: 'success' }];
	if (archive) buttons.push({ emoji: '📄', label: 'Transcript', style: 'primary' });
	buttons.push({ emoji: '🗑️', label: 'Delete', style: 'danger' });
	return {
		author: bot,
		container: null,
		content: null,
		embeds: [
			{
				color: colour,
				description,
				footer: footer ? { icon: bot.avatar, text: footer } : null,
				title: '🔒 Ticket closed'
			}
		],
		mentions: mentions.list,
		rows: [{ buttons, type: 'buttons' }]
	};
}

/**
 * A short, readable duration like "2 days".
 * @param {number} ms
 */
export function formatDuration(ms) {
	const units = [
		['day', 86_400_000],
		['hour', 3_600_000],
		['minute', 60_000],
		['second', 1000]
	];
	for (const [name, size] of units) {
		if (ms >= size) {
			const n = Math.round(ms / size);
			return `${n} ${name}${n === 1 ? '' : 's'}`;
		}
	}
	return 'a moment';
}

/**
 * Preview of a panel, like the bot's `buildPanel` and the panels route.
 * @param {object} options
 * @param {boolean} [options.v2]
 * @param {string} [options.colour]
 * @param {{ name: string, avatar?: string | null }} options.bot
 * @param {'BUTTON' | 'MENU' | 'MESSAGE'} options.type
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.image]
 * @param {string} [options.thumbnail]
 * @param {string | null} [options.footer]
 * @param {{ name: string, emoji?: string, description?: string }[]} options.categories
 * @returns {PreviewModel}
 */
export function panelPreview({
	v2 = false,
	colour = '#009999',
	bot,
	type,
	title = '',
	description = '',
	image = '',
	thumbnail = '',
	footer = null,
	categories
}) {
	let control = null;
	if (type === 'MESSAGE') {
		control = {
			buttons: [{ emoji: '🎫', label: 'Create a ticket', style: 'primary' }],
			type: 'buttons'
		};
	} else if (type === 'MENU') {
		control = {
			options: categories.map((c) => ({
				description: c.description,
				emoji: c.emoji,
				label: c.name
			})),
			placeholder: 'Select a ticket category',
			type: 'menu'
		};
	} else if (categories.length) {
		control = {
			buttons: categories.map((c) => ({
				emoji: c.emoji,
				label: c.name,
				style: categories.length === 1 ? 'primary' : 'secondary'
			})),
			type: 'buttons'
		};
	}
	const base = { author: bot, content: null, mentions: [], rows: [] };

	if (!v2) {
		return {
			...base,
			container: null,
			embeds: [
				{
					color: colour,
					description: description || null,
					footer: footer ? { icon: bot.avatar, text: footer } : null,
					image: image || null,
					thumbnail: thumbnail || null,
					title: title || null
				}
			],
			rows: control ? [control] : []
		};
	}

	const children = [
		{
			markdown: [title && `## ${title}`, description].filter(Boolean).join('\n') || '',
			thumbnail: thumbnail || null,
			type: 'text'
		}
	];
	if (image) children.push({ type: 'gallery', url: image });
	if (control) children.push(control);
	if (footer) children.push({ text: footer, type: 'subtext' });
	return { ...base, container: { accent: colour, children }, embeds: [] };
}

/**
 * Discord colour names the bot accepts, for previews (the rest fall back to the default).
 */
const NAMED_COLOURS = {
	Aqua: '#1abc9c',
	Blue: '#3498db',
	Blurple: '#5865f2',
	DarkAqua: '#11806a',
	DarkBlue: '#206694',
	DarkGreen: '#1f8b4c',
	DarkRed: '#992d22',
	Default: '#000000',
	Fuchsia: '#eb459e',
	Gold: '#f1c40f',
	Green: '#57f287',
	Grey: '#95a5a6',
	Orange: '#e67e22',
	Purple: '#9b59b6',
	Red: '#ed4245',
	White: '#ffffff',
	Yellow: '#fee75c'
};

/**
 * A CSS colour for a colour the guild settings accept. Anything else (which could be used to inject CSS) falls back.
 * @param {string} colour
 * @param {string} [fallback]
 * @returns {string}
 */
export function cssColour(colour, fallback = '#5865f2') {
	if (typeof colour !== 'string') return fallback;
	if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(colour)) return colour;
	return NAMED_COLOURS[colour] ?? fallback;
}

/**
 * How a category's emoji shows on a button or menu option: a name like `ticket`, the emoji itself, or a custom emoji ID.
 * @param {string | null | undefined} value
 * @returns {{ text: string } | { url: string } | null}
 */
export function resolveEmoji(value) {
	if (!value) return null;
	const text = String(value).trim();
	if (/^\d{17,20}$/.test(text))
		return { url: `https://cdn.discordapp.com/emojis/${text}.webp?size=44` };
	return { text: emojiNames.get(text) ?? text };
}
