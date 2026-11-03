// Minimal stand-in for the bot's HTTP API, shaped like the real responses.
export const GUILD_ID = '451745464480432129';
export const CATEGORY_ID = 7;

export const user = { id: '319467558166069248', username: 'admin', avatar: null, locale: 'en-GB' };

export const client = {
	id: '451745464480432130',
	username: 'Tickets',
	discriminator: '0',
	avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
	public: false,
	version: '4.0.52',
	stats: {
		activatedUsers: 3,
		archivedMessages: 120,
		avgResolutionTime: '1h',
		avgResponseTime: '5m',
		categories: 1,
		guilds: 1,
		members: 10,
		tags: 2,
		tickets: 4
	}
};

export const guild = {
	id: GUILD_ID,
	name: 'Test Server',
	logo: null,
	icon: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	stats: {
		avgResolutionTime: '1h',
		avgResponseTime: '5m',
		categories: [{ id: CATEGORY_ID, name: 'Support', tickets: 4 }],
		tags: 2,
		tickets: 4
	}
};

export const channels = [
	{ id: '1', name: 'Tickets', type: 4 },
	{ id: '2', name: 'Tickets overflow', type: 4 },
	{ id: '3', name: 'logs', type: 0 }
];
export const roles = [
	{ id: GUILD_ID, name: '@everyone', color: 0, rawPosition: 0 },
	{ id: '10', name: 'Staff', color: 3447003, rawPosition: 1 },
	{ id: '11', name: 'VIP', color: 0, rawPosition: 2 },
	{ id: '12', name: 'Muted', color: 0, rawPosition: 3 }
];

export const settings = () => ({
	id: GUILD_ID,
	archive: true,
	componentsV2: false,
	autoClose: 0,
	autoTag: [],
	blocklist: [],
	claimButton: false,
	closeButton: true,
	closeRequests: true,
	errorColour: 'Red',
	footer: 'Discord Tickets',
	ghostPing: false,
	holidays: ['2026-12-25'],
	locale: 'en-GB',
	logChannel: null,
	primaryColour: '#009999',
	staleAfter: null,
	successColour: 'Green',
	ticketNumberOffset: 0,
	webhookSecret: '********',
	webhookUrl: 'https://example.com/hook',
	// days off from older dashboards are null
	workingHours: [
		'Europe/London',
		null,
		['09:00', '17:00'],
		['09:00', '17:00'],
		null,
		null,
		null,
		null
	]
});

export const category = () => ({
	id: CATEGORY_ID,
	name: 'Support',
	channelName: 'ticket-{num}',
	anonymous: false,
	claiming: false,
	cooldown: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	customTopic: null,
	description: 'Get help',
	discordCategory: '1',
	emoji: '🎫',
	enableFeedback: false,
	image: '',
	memberLimit: 1,
	openingMessage: 'Hi {username}',
	pingRoles: [],
	ratelimit: null,
	requiredRoles: [],
	requireTopic: false,
	staffRoles: ['10'],
	totalLimit: 50,
	questions: [
		{
			id: 'q1',
			label: 'Pick one',
			type: 'MENU',
			maxLength: 1,
			minLength: 1,
			order: 0,
			placeholder: '',
			required: true,
			style: 2,
			value: '',
			// stored before options had ids
			options: [
				{ label: 'Alpha', description: '', emoji: '', value: 'a' },
				{ label: 'Beta', description: '', emoji: '', value: 'b' }
			]
		}
	]
});

// ---- portal (archive / replies) ----
export const STAFF_ID = '200000000000000001';
export const OPEN_TICKET = '300000000000000001';
export const CLOSED_TICKET = '300000000000000002';
export const CLOSABLE_TICKET = '300000000000000003';

export const portalGuild = { id: GUILD_ID, name: 'Test Server', logo: null, privilegeLevel: 1 };

export const portalUsers = {
	[user.id]: { username: 'admin', displayName: 'Admin', avatar: null },
	[STAFF_ID]: { username: 'helper', displayName: 'Helpful Staff', avatar: null }
};

const supportCategory = { id: CATEGORY_ID, name: 'Support', emoji: '🎫' };

export const portalTickets = () => [
	{
		id: OPEN_TICKET,
		number: 12,
		topic: 'Cannot log in',
		open: true,
		category: supportCategory,
		createdById: user.id,
		claimedById: STAFF_ID,
		createdAt: '2026-11-01T10:00:00.000Z',
		closedAt: null,
		messageCount: 3
	},
	{
		id: CLOSED_TICKET,
		number: 11,
		topic: 'Refund <img src=x onerror=alert(1)>',
		open: false,
		category: supportCategory,
		createdById: user.id,
		claimedById: null,
		createdAt: '2026-10-01T10:00:00.000Z',
		closedAt: '2026-10-02T10:00:00.000Z',
		messageCount: 2
	},
	{
		id: CLOSABLE_TICKET,
		number: 13,
		topic: 'Close me',
		open: true,
		category: supportCategory,
		createdById: user.id,
		claimedById: null,
		createdAt: '2026-11-02T10:00:00.000Z',
		closedAt: null,
		messageCount: 0
	}
];

const author = (id, extra = {}) => ({
	id,
	username: portalUsers[id].username,
	displayName: portalUsers[id].displayName,
	avatar: null,
	bot: false,
	roleColour: id === STAFF_ID ? '#3498db' : null,
	...extra
});

export const portalMessages = () => ({
	[OPEN_TICKET]: [
		{
			id: '400000000000000001',
			author: author(user.id),
			content: 'I **cannot** log in, see <@' + STAFF_ID + '>',
			embeds: [],
			attachments: [
				{
					name: 'screenshot.png',
					url: 'https://cdn.discordapp.com/attachments/1/2/screenshot.png',
					contentType: 'image/png',
					size: 1024
				},
				{
					name: 'log.txt',
					url: 'https://cdn.discordapp.com/attachments/1/3/log.txt',
					contentType: 'text/plain',
					size: 2048,
					expired: true
				}
			],
			createdAt: '2026-11-01T10:01:00.000Z',
			editedAt: null,
			deleted: false,
			viaWeb: false
		},
		{
			id: '400000000000000002',
			author: author(STAFF_ID),
			content: 'Try resetting your password. <script>alert(1)</script> [x](javascript:alert(1))',
			embeds: [{ title: 'Password reset', description: 'Go to *settings*' }],
			attachments: [],
			createdAt: '2026-11-01T10:05:00.000Z',
			editedAt: '2026-11-01T10:06:00.000Z',
			deleted: false,
			viaWeb: false
		},
		{
			id: '400000000000000003',
			author: author(user.id),
			content: 'this was deleted',
			embeds: [],
			attachments: [],
			createdAt: '2026-11-01T10:07:00.000Z',
			editedAt: null,
			deleted: true,
			viaWeb: true
		}
	],
	[CLOSED_TICKET]: [
		{
			id: '400000000000000010',
			author: author(user.id),
			content: 'Refund please',
			embeds: [],
			attachments: [],
			createdAt: '2026-10-01T10:01:00.000Z',
			editedAt: null,
			deleted: false,
			viaWeb: false
		}
	],
	[CLOSABLE_TICKET]: []
});
