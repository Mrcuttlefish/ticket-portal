import ms from 'ms';

/** The bot never sends the webhook secret back, only this mask when one is set. */
export const WEBHOOK_SECRET_MASK = '********';

/**
 * Format a duration in milliseconds for a text input ("1h", "30m").
 * `null`/`undefined` → '' (not set); `0` → 'off' when `allowOff`.
 * @param {number | null | undefined} value
 * @param {{ allowOff?: boolean }} [options]
 */
export function durationToInput(value, { allowOff = false } = {}) {
	if (value === null || value === undefined) return '';
	if (value === 0) return allowOff ? 'off' : '';
	return ms(value);
}

/**
 * Parse a duration text input to milliseconds.
 * '' → null (not set / use the server setting); 'off' or '0' → 0 when `allowOff`.
 * @param {string | null | undefined} input
 * @param {{ allowOff?: boolean, field?: string }} [options]
 * @returns {number | null}
 */
export function inputToDuration(input, { allowOff = false, field = 'Duration' } = {}) {
	const text = String(input ?? '').trim();
	if (text === '') return null;
	if (allowOff && /^(off|0|none|disabled?)$/i.test(text)) return 0;
	const value = ms(text);
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		throw new Error(`${field}: "${text}" is not a valid duration (e.g. 30m, 12h, 3d).`);
	}
	return value;
}

const OFF_DAY = ['00:00', '00:00'];

/**
 * Working hours from the API → form state. Days off (`null`, or the same start
 * and end time) become `[]` so the time inputs show empty.
 * @param {Array} workingHours `[timezone, sunday, ..., saturday]`
 */
export function workingHoursToForm(workingHours) {
	const [timezone = 'UTC', ...days] = Array.isArray(workingHours) ? workingHours : [];
	const out = [timezone];
	for (let i = 0; i < 7; i++) {
		const day = days[i];
		out.push(Array.isArray(day) && day.length === 2 && day[0] !== day[1] ? [...day] : []);
	}
	return out;
}

/**
 * Form state → working hours for the API. Days off are sent as `["00:00", "00:00"]`,
 * which the bot treats as a day off and which every version of its validation accepts.
 * @param {Array} form
 */
export function workingHoursFromForm(form) {
	const [timezone, ...days] = form;
	return [
		timezone,
		...days.map((day) => {
			if (!Array.isArray(day) || !day[0] || !day[1] || day[0] === day[1]) return [...OFF_DAY];
			return [day[0], day[1]];
		})
	];
}

/**
 * Holiday dates, sorted and de-duplicated, as `YYYY-MM-DD`.
 * @param {string[]} dates
 */
export function normaliseHolidays(dates) {
	return [...new Set((dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}

/**
 * What to send for the webhook secret: the mask (unchanged), `null` (remove), or a new secret.
 * @param {{ input: string, hadSecret: boolean, remove: boolean }} state
 */
export function webhookSecretPayload({ input, hadSecret, remove }) {
	if (remove) return null;
	if (input) return input;
	return hadSecret ? WEBHOOK_SECRET_MASK : null;
}

/**
 * A webhook URL the bot will accept: empty (none) or https with no credentials.
 * @param {string} input
 * @returns {string | null}
 */
export function parseWebhookUrl(input) {
	const text = String(input ?? '').trim();
	if (!text) return null;
	let url;
	try {
		url = new URL(text);
	} catch {
		throw new Error('Webhook URL: not a valid URL.');
	}
	if (url.protocol !== 'https:') throw new Error('Webhook URL: must start with https://');
	if (url.username || url.password)
		throw new Error('Webhook URL: must not contain a username or password.');
	return url.href;
}

/**
 * Nullable boolean ⇄ select value, for per-category overrides of server settings.
 */
export const override = {
	/** @param {boolean | null | undefined} value */
	toSelect: (value) => (value === true ? 'on' : value === false ? 'off' : 'inherit'),
	/** @param {string} value */
	fromSelect: (value) => (value === 'on' ? true : value === 'off' ? false : null)
};

/**
 * Clean role limit rows for the API: drop incomplete rows and duplicate roles (last wins).
 * @param {{ role: string, limit: number | string }[]} rows
 */
export function cleanRoleLimits(rows) {
	const byRole = new Map();
	for (const row of rows ?? []) {
		const limit = Number(row?.limit);
		if (
			!row?.role ||
			row.limit === '' ||
			row.limit === null ||
			!Number.isInteger(limit) ||
			limit < 0
		)
			continue;
		byRole.set(row.role, { role: row.role, limit: Math.min(limit, 100) });
	}
	return [...byRole.values()];
}

/**
 * Clean ping rules for the API: a rule needs at least one creator role; `ping` may be empty (ping nobody).
 * @param {{ roles: string[], ping: string[] }[]} rows
 */
export function cleanPingRoleRules(rows) {
	return (rows ?? [])
		.filter((row) => Array.isArray(row?.roles) && row.roles.length > 0)
		.map((row) => ({ roles: [...new Set(row.roles)], ping: [...new Set(row.ping ?? [])] }));
}
