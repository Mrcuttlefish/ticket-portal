import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	closedMessagePreview,
	cssColour,
	formatDuration,
	formatOpeningMessage,
	openingButtons,
	openingMessagePreview,
	panelPreview,
	replaceNumber,
	resolveEmoji
} from '../../src/lib/util/preview.js';

const bot = { avatar: 'https://cdn.discordapp.com/avatars/1/a.webp', name: 'Tickets' };
const creator = { avatar: 'https://cdn.discordapp.com/avatars/2/b.webp', name: 'alex' };
const category = {
	description: 'Help',
	image: '',
	name: 'Support',
	openingMessage: 'Hi {name}, #{num:4}'
};
const fields = [{ name: 'Topic', value: 'Login' }];

test('placeholders are filled in like the bot', () => {
	assert.equal(replaceNumber('{num:4}-{number}', 7), '0007-7');
	assert.equal(
		formatOpeningMessage('{mention} {displayname} {tag} {category} {topic} {avgRating} {unknown}', {
			category,
			creator: '@@',
			displayName: 'Alex',
			stats: { avgRating: 4.5 },
			topic: 'Login',
			username: 'alex'
		}),
		'@@ Alex alex Support Login 4.5 {unknown}'
	);
});

test('opening buttons match the bot', () => {
	assert.deepEqual(
		openingButtons({ claim: 'claim', close: true, edit: true }).map((b) => [b.label, b.style]),
		[
			['Edit', 'secondary'],
			['Claim', 'secondary'],
			['Close', 'danger']
		]
	);
	assert.deepEqual(openingButtons({}), []);
});

test('classic opening message: two embeds, footer on the last one, pings before the creator', () => {
	const m = openingMessagePreview({
		bot,
		buttons: openingButtons({ close: true }),
		category,
		creator,
		fields,
		footer: 'Powered by us',
		pingRoles: [{ color: '#ff0000', name: 'Staff' }]
	});
	assert.equal(m.container, null);
	assert.equal(m.embeds.length, 2);
	assert.equal(m.embeds[0].author.name, 'alex');
	assert.equal(m.embeds[0].description, `Hi ${m.mentions[0].token}, #0001`);
	assert.deepEqual(m.embeds[1].fields, fields);
	assert.equal(m.embeds[0].footer, undefined);
	assert.equal(m.embeds[1].footer.text, 'Powered by us');
	assert.equal(
		m.content,
		`${m.mentions[1].token},\n${m.mentions[0].token} has created a new ticket`
	);
	assert.deepEqual(
		m.mentions.map((x) => [x.name, x.kind]),
		[
			['alex', 'user'],
			['Staff', 'role']
		]
	);
	assert.equal(m.rows[0].buttons[0].label, 'Close');
});

test('new layout opening message: a container with the details and buttons inside', () => {
	const m = openingMessagePreview({
		bot,
		buttons: openingButtons({ close: true }),
		category: { ...category, image: 'https://example.com/i.png' },
		creator,
		fields: [],
		footer: 'f',
		v2: true
	});
	assert.equal(m.embeds.length, 0);
	assert.deepEqual(
		m.container.children.map((c) => c.type),
		['text', 'gallery', 'separator', 'subtext', 'buttons', 'subtext']
	);
	assert.equal(m.container.children[0].thumbnail, creator.avatar);
	assert.ok(m.container.children[0].markdown.startsWith('### alex\nHi'));
	assert.equal(m.container.children[3].text, '—');
	assert.deepEqual(m.rows, []);
});

test('text and off styles send plain content', () => {
	const text = openingMessagePreview({ bot, category, creator, fields, style: 'TEXT', v2: true });
	assert.equal(text.embeds.length, 0);
	assert.equal(text.container, null);
	assert.ok(text.content.includes('**alex**'));
	assert.ok(text.content.includes('Hi '));
	assert.ok(text.content.endsWith('**Topic**\nLogin'));

	const off = openingMessagePreview({ bot, category, creator, fields, style: 'OFF' });
	assert.ok(!off.content.includes('Hi '));
	assert.ok(off.content.endsWith('**Topic**\nLogin'));
	assert.ok(off.content.length <= 2000);
});

test('text style is cut to fit in a Discord message', () => {
	const long = { ...category, openingMessage: 'x'.repeat(3000) };
	const m = openingMessagePreview({ bot, category: long, creator, fields, style: 'TEXT' });
	assert.ok(m.content.length <= 2000, String(m.content.length));
	assert.ok(m.content.endsWith('Login'));
});

test('closed ticket message', () => {
	const m = closedMessagePreview({
		archive: false,
		bot,
		closedBy: 'Staff',
		keepClosedFor: 86_400_000
	});
	assert.equal(m.embeds[0].title, '🔒 Ticket closed');
	assert.ok(m.embeds[0].description.includes('in 1 day'));
	assert.equal(m.mentions[0].name, 'Staff');
	assert.deepEqual(
		m.rows[0].buttons.map((b) => b.label),
		['Reopen', 'Delete']
	);
	const kept = closedMessagePreview({ archive: true, bot, closedBy: 'alex', keepClosedFor: 0 });
	assert.ok(!kept.embeds[0].description.includes('deleted in'));
	assert.equal(kept.rows[0].buttons.length, 3);
});

test('formatDuration', () => {
	assert.equal(formatDuration(3_600_000), '1 hour');
	assert.equal(formatDuration(2 * 86_400_000), '2 days');
	assert.equal(formatDuration(5), 'a moment');
});

test('panel previews', () => {
	const categories = [
		{ description: 'Get help', emoji: 'ticket', name: 'Support' },
		{ emoji: '💰', name: 'Billing' }
	];
	const buttons = panelPreview({ bot, categories, title: 'Open a ticket', type: 'BUTTON' });
	assert.equal(buttons.embeds[0].title, 'Open a ticket');
	assert.deepEqual(
		buttons.rows[0].buttons.map((b) => [b.label, b.style]),
		[
			['Support', 'secondary'],
			['Billing', 'secondary']
		]
	);
	const one = panelPreview({ bot, categories: categories.slice(0, 1), type: 'BUTTON' });
	assert.equal(one.rows[0].buttons[0].style, 'primary');

	const menu = panelPreview({
		bot,
		categories,
		description: 'Pick one',
		footer: 'f',
		image: 'https://example.com/i.png',
		thumbnail: 'https://example.com/t.png',
		title: 'Help',
		type: 'MENU',
		v2: true
	});
	assert.deepEqual(
		menu.container.children.map((c) => c.type),
		['text', 'gallery', 'menu', 'subtext']
	);
	assert.equal(menu.container.children[0].markdown, '## Help\nPick one');
	assert.equal(menu.container.children[0].thumbnail, 'https://example.com/t.png');
	assert.equal(menu.container.children[2].placeholder, 'Select a ticket category');
	assert.equal(menu.container.children[2].options[0].description, 'Get help');

	const empty = panelPreview({ bot, categories: [], type: 'BUTTON' });
	assert.deepEqual(empty.rows, []);
});

test('cssColour only lets through colours (no CSS injection)', () => {
	assert.equal(cssColour('#ABCDEF'), '#ABCDEF');
	assert.equal(cssColour('#abc'), '#abc');
	assert.equal(cssColour('Red'), '#ed4245');
	assert.equal(cssColour('red;background:url(x)'), '#5865f2');
	assert.equal(cssColour('#fff;}'), '#5865f2');
	assert.equal(cssColour(null, ''), '');
});

test('resolveEmoji', () => {
	assert.deepEqual(resolveEmoji('ticket'), { text: '🎫' });
	assert.deepEqual(resolveEmoji('🎫'), { text: '🎫' });
	assert.deepEqual(resolveEmoji('123456789012345678'), {
		url: 'https://cdn.discordapp.com/emojis/123456789012345678.webp?size=44'
	});
	assert.equal(resolveEmoji(''), null);
});
