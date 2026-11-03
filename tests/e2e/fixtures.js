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

export const channels = [{ id: '1', name: 'Tickets', type: 4 }];
export const roles = [
	{ id: GUILD_ID, name: '@everyone', color: 0, rawPosition: 0 },
	{ id: '10', name: 'Staff', color: 3447003, rawPosition: 1 }
];

export const category = () => ({
	id: CATEGORY_ID,
	name: 'Support',
	channelName: 'ticket-{num}',
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
