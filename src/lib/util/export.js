/**
 * Exporting and importing all server data is limited to the server owner (and the bot's super users).
 * The bot says so with `canManageData`; failing that, compare `ownerId`;
 * an older bot sends neither, so the option is shown and the API decides.
 * @param {{ canManageData?: boolean, ownerId?: string | null } | null | undefined} guild
 * @param {{ id?: string } | null | undefined} user
 */
export function canManageData(guild, user) {
	if (typeof guild?.canManageData === 'boolean') return guild.canManageData;
	if (!guild?.ownerId) return true;
	return Boolean(user?.id) && guild.ownerId === user.id;
}

export const OWNER_ONLY_MESSAGE = 'Only the server owner can export or import server data.';

/**
 * Pick a download name from a Content-Disposition header.
 * @param {string | null} header
 * @param {string} fallback
 */
export function filenameFrom(header, fallback) {
	const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? '');
	if (!match) return fallback;
	try {
		return decodeURIComponent(match[1]).replace(/[/\\]/g, '_');
	} catch {
		return match[1].replace(/[/\\]/g, '_');
	}
}

/**
 * Request an export and save it, or throw an Error with a readable message.
 * @param {typeof fetch} fetch
 * @param {string} guildId
 */
export async function downloadExport(fetch, guildId) {
	const response = await fetch(`/api/admin/guilds/${guildId}/export`, { credentials: 'include' });
	if (!response.ok) {
		let message = '';
		if (response.headers.get('content-type')?.includes('json')) {
			const body = await response.json().catch(() => ({}));
			message = body?.message || body?.error || '';
		}
		if (response.status === 403) message ||= OWNER_ONLY_MESSAGE;
		throw new Error(message || `The export failed (${response.status}).`);
	}
	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filenameFrom(response.headers.get('content-disposition'), `tickets-${guildId}.zip`);
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
