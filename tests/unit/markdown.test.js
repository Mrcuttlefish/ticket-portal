import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, renderMarkdown, safeHref } from '../../src/lib/util/markdown.js';

test('escapeHTML escapes all HTML special characters', () => {
	assert.equal(
		escapeHTML(`<a href="x" onclick='y'>&</a>`),
		'&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
	);
	assert.equal(escapeHTML(undefined), '');
});

test('raw HTML is rendered as text', () => {
	const html = renderMarkdown('<img src=x onerror=alert(1)>');
	assert.ok(!html.includes('<img'), html);
	assert.ok(html.includes('&lt;img'), html);
	const inline = renderMarkdown('hello <script>alert(1)</script> world');
	assert.ok(!inline.includes('<script'), inline);
});

test('dangerous link protocols are dropped', () => {
	for (const href of [
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:x'
	]) {
		const html = renderMarkdown(`[click](${href})`);
		assert.ok(!html.includes('<a'), html);
		assert.ok(html.includes('click'), html);
	}
	assert.equal(safeHref('  javascript:alert(1)'), null);
	assert.equal(safeHref('/relative'), null);
});

test('safe links are kept with noopener', () => {
	const html = renderMarkdown('[site](https://example.com/a?b=1)');
	assert.match(
		html,
		/<a href="https:\/\/example.com\/a\?b=1" target="_blank" rel="noopener noreferrer nofollow">site<\/a>/
	);
});

test('images only allow http(s)', () => {
	assert.ok(!renderMarkdown('![x](javascript:alert(1))').includes('<img'));
	assert.ok(
		renderMarkdown('![x](https://cdn.discordapp.com/a.png)').includes(
			'<img src="https://cdn.discordapp.com/a.png"'
		)
	);
});

test('markdown formatting still works', () => {
	const html = renderMarkdown('**bold** _it_ `code`');
	assert.ok(html.includes('<strong>bold</strong>'));
	assert.ok(html.includes('<em>it</em>'));
	assert.ok(html.includes('<code>code</code>'));
});

test('placeholder values are escaped unless marked as HTML', () => {
	const evil = '<img src=x onerror=alert(1)>';
	const html = renderMarkdown('Hi {username}', [[/{+\s?(user)?name\s?}+/gi, evil]]);
	assert.ok(!html.includes('<img'), html);
	const trusted = renderMarkdown('Hi {username}', [
		[/{+\s?(user)?name\s?}+/gi, `<b>${escapeHTML(evil)}</b>`, { html: true }]
	]);
	assert.ok(trusted.includes('<b>&lt;img'), trusted);
	// `$&` and friends in values must not be treated as replacement patterns
	assert.ok(renderMarkdown('{name}', [[/{name}/g, '$&$&']]).includes('$&amp;$&amp;'));
});
