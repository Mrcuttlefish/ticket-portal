import { test, expect } from './helpers.js';
import { GUILD_ID, CATEGORY_ID } from './fixtures.js';

const PAYLOAD = '<img src=x onerror=alert(document.domain)>';
const enc = encodeURIComponent;

test.describe('pages render cleanly under the CSP', () => {
	for (const path of [
		'/settings',
		`/settings/${GUILD_ID}`,
		`/settings/${GUILD_ID}/general`,
		`/settings/${GUILD_ID}/categories`,
		`/settings/${GUILD_ID}/categories/${CATEGORY_ID}`,
		`/settings/${GUILD_ID}/categories/new`,
		`/settings/${GUILD_ID}/panels`
	]) {
		test(path, async ({ page, issues }) => {
			const response = await page.goto(path);
			expect(response.status()).toBe(200);
			await page.waitForLoadState('networkidle');
			expect(issues.errors).toEqual([]);
			expect(issues.csp).toEqual([]);
		});
	}
});

test('security headers are set', async ({ page }) => {
	const response = await page.goto('/settings');
	const headers = response.headers();
	const csp = headers['content-security-policy'];
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toMatch(/script-src 'self' 'nonce-/);
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

test.describe('reflected XSS through URLs', () => {
	for (const path of [
		`/settings/${enc(PAYLOAD)}`,
		`/settings/${GUILD_ID}/${enc(PAYLOAD)}`,
		`/settings/${GUILD_ID}/categories/${enc(PAYLOAD)}`,
		`/${enc(PAYLOAD)}`
	]) {
		test(path, async ({ page, issues }) => {
			const response = await page.goto(path);
			expect(response.status()).toBe(404);
			await page.waitForLoadState('networkidle');
			expect(issues.dialogs).toEqual([]);
			await expect(page.locator('img[src="x"]')).toHaveCount(0);
		});
	}

	test('API error text is shown as text, not HTML', async ({ page, issues }) => {
		// a valid-looking but unknown category makes the API return an error that echoes input
		await page.goto(`/settings/${GUILD_ID}/categories/999`);
		await page.waitForLoadState('networkidle');
		expect(issues.dialogs).toEqual([]);
		await expect(page.locator('img[src="x"]')).toHaveCount(0);
		await expect(page.getByText('Unknown <img src=x onerror=alert(1)> category')).toBeVisible();
	});
});

test('route params must be IDs', async ({ request }) => {
	for (const path of [`/settings/123`, `/settings/${GUILD_ID}/categories/abc`, '/favicon.ico']) {
		const response = await request.get(path);
		expect(response.status(), path).toBe(404);
	}
});

test('production errors do not leak internal messages', async ({ page }) => {
	await page.goto(`/settings/${GUILD_ID}/${enc(PAYLOAD)}`);
	await expect(page.getByText('Not Found').first()).toBeVisible();
});

test('a bad locale cookie falls back instead of crashing', async ({ page, context, baseURL }) => {
	await context.addCookies([{ name: 'locale', value: '../../../etc/passwd', url: baseURL }]);
	const response = await page.goto('/login');
	expect(response.status()).toBe(200);
});

test.describe('markdown previews escape HTML', () => {
	test('opening message and channel name previews', async ({ page, issues }) => {
		await page.goto(`/settings/${GUILD_ID}/categories/new`);
		await page.waitForLoadState('networkidle');
		const textareas = page.locator('textarea:visible');
		const count = await textareas.count();
		for (let i = 0; i < count; i++)
			await textareas.nth(i).fill(`${PAYLOAD} [x](javascript:alert(1))`);
		const inputs = page.locator('input[type=text]:visible');
		for (let i = 0; i < (await inputs.count()); i++) {
			await inputs
				.nth(i)
				.fill(PAYLOAD)
				.catch(() => {});
		}
		await page.waitForTimeout(300);
		expect(issues.dialogs).toEqual([]);
		await expect(page.locator('img[src="x"]')).toHaveCount(0);
		await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
	});
});
