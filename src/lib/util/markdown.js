import { marked } from 'marked';

const HTML_ESCAPES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/**
 * Escape a string for use in HTML text or a quoted attribute.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHTML(value) {
	return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Only allow absolute http(s)/mailto links; anything else (javascript:, data:, vbscript:, ...) is dropped.
 * @param {string} href
 * @returns {string | null}
 */
export function safeHref(href) {
	if (typeof href !== 'string') return null;
	try {
		const url = new URL(href.trim());
		return SAFE_PROTOCOLS.includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

const renderer = new marked.Renderer();

// Discord doesn't render raw HTML, so neither do we: show it as text.
renderer.html = (html) => escapeHTML(html);

renderer.link = (href, title, text) => {
	const safe = safeHref(href);
	if (!safe) return text;
	const titleAttr = title ? ` title="${escapeHTML(title)}"` : '';
	return `<a href="${escapeHTML(safe)}"${titleAttr} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
};

renderer.image = (href, title, text) => {
	const safe = safeHref(href);
	if (!safe || safe.startsWith('mailto:')) return escapeHTML(text ?? '');
	const titleAttr = title ? ` title="${escapeHTML(title)}"` : '';
	return `<img src="${escapeHTML(safe)}" alt="${escapeHTML(text ?? '')}"${titleAttr} />`;
};

// Ticket messages are written by anyone who can open a ticket. Discord doesn't turn `![](url)` into an image, and
// loading one would let a ticket's creator see the IP address and viewing times of the staff reading the
// transcript, so transcripts show such images as links instead.
const transcriptRenderer = new marked.Renderer();
transcriptRenderer.html = renderer.html;
transcriptRenderer.link = renderer.link;
transcriptRenderer.image = (href, title, text) => {
	const safe = safeHref(href);
	const label = escapeHTML(text || href || '');
	if (!safe) return label;
	return `<a href="${escapeHTML(safe)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
};

/**
 * Render user-supplied markdown to HTML that is safe to pass to `{@html}`.
 * Raw HTML is escaped and only http(s)/mailto links and images are kept.
 *
 * Placeholders are substituted *after* rendering; each replacement is a
 * `[pattern, value]` pair where `value` is plain text (it will be escaped), or
 * `[pattern, value, { html: true }]` where `value` is already-trusted HTML.
 * @param {string} source
 * @param {Array<[RegExp, unknown, { html?: boolean }?]>} [replacements]
 * @param {{ images?: boolean }} [options] `images: false` shows markdown images as links (for ticket messages)
 * @returns {string}
 */
export function renderMarkdown(source, replacements = [], { images = true } = {}) {
	let html = marked.parse(String(source ?? ''), {
		renderer: images ? renderer : transcriptRenderer,
		headerIds: false,
		mangle: false
	});
	for (const [pattern, value, options] of replacements) {
		const replacement = options?.html ? String(value) : escapeHTML(value);
		html = html.replace(pattern, () => replacement);
	}
	return html;
}
