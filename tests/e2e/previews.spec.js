import { test, expect } from './helpers.js';
import { GUILD_ID, CATEGORY_ID } from './fixtures.js';

const PAYLOAD = '<img src=x onerror=alert(document.domain)>';
const categoryPath = `/settings/${GUILD_ID}/categories/${CATEGORY_ID}`;
const panelsPath = `/settings/${GUILD_ID}/panels`;

/** turn on Discord's new layout in the mock API's settings */
const useNewLayout = (context, baseURL) =>
	context.addCookies([{ name: 'e2e_v2', value: '1', url: baseURL }]);

const opening = (page) => page.getByRole('figure', { name: 'Opening message preview' });
const panel = (page) => page.getByRole('figure', { name: 'Panel preview' });

test.describe('opening message preview', () => {
	test('classic embeds', async ({ page, issues }) => {
		await page.goto(categoryPath);
		await page.waitForLoadState('networkidle');
		const preview = opening(page);
		await expect(preview).toHaveAttribute('data-preview-layout', 'embed');
		await expect(preview).toContainText('has created a new ticket');
		// {username} is a mention of the member who opened the ticket
		await expect(preview.locator('[data-preview="embed"] .discord-mention').first()).toHaveText(
			'@admin'
		);
		// the fixture category has a question, so there's an answers embed and an Edit button
		await expect(preview.locator('[data-preview="embed"]')).toHaveCount(2);
		await expect(preview.locator('[data-preview="embed"]').nth(1)).toContainText('Pick one');
		await expect(preview.locator('[data-preview="buttons"]')).toContainText('Edit');
		await expect(preview.locator('[data-preview="buttons"]')).toContainText('Close');
		// the server footer is on the last embed
		await expect(preview.locator('[data-preview="embed"]').nth(1)).toContainText('Discord Tickets');
		expect(issues.errors).toEqual([]);
	});

	test('follows the message and style as they change', async ({ page }) => {
		await page.goto(categoryPath);
		await page.waitForLoadState('networkidle');
		const preview = opening(page);
		await page.getByRole('textbox', { name: /^Opening message/ }).fill('**Welcome** to #{num:3}');
		await expect(preview.locator('strong', { hasText: 'Welcome' })).toBeVisible();
		await expect(preview).toContainText('to #001');

		const style = page.getByRole('combobox', { name: /^Style/ });
		await style.selectOption('TEXT');
		await expect(preview).toHaveAttribute('data-preview-layout', 'text');
		await expect(preview).toContainText('Welcome');

		await style.selectOption('OFF');
		await expect(preview).toHaveAttribute('data-preview-layout', 'text');
		await expect(preview).not.toContainText('Welcome');
		await expect(preview).toContainText('has created a new ticket');
	});

	test("Discord's new layout", async ({ page, context, baseURL, issues }) => {
		await useNewLayout(context, baseURL);
		await page.goto(categoryPath);
		await page.waitForLoadState('networkidle');
		const preview = opening(page);
		await expect(preview).toHaveAttribute('data-preview-layout', 'v2');
		const container = preview.locator('[data-preview="container"]');
		await expect(container.locator('h3')).toHaveText('admin');
		await expect(container.locator('[data-preview="buttons"]')).toContainText('Close');
		await expect(container).toContainText('Discord Tickets');
		expect(issues.errors).toEqual([]);
	});

	test('the closed ticket message shows when channels are kept', async ({ page }) => {
		await page.goto(categoryPath);
		await page.waitForLoadState('networkidle');
		const closed = page.getByRole('figure', { name: 'Closed ticket preview' });
		await expect(closed).toHaveCount(0);
		await page.getByRole('combobox', { name: /^When a ticket closes/ }).selectOption('timed');
		await page.getByRole('textbox', { name: /^Delete closed channels after/ }).fill('2d');
		await expect(closed).toContainText('Ticket closed');
		await expect(closed).toContainText('deleted in 2 days');
		await expect(closed.locator('[data-preview="buttons"]')).toContainText('Reopen');
		await expect(closed.locator('[data-preview="buttons"]')).toContainText('Transcript');

		// anonymous categories never show who closed it
		await page.getByRole('checkbox', { name: /^Anonymous/ }).check();
		await expect(closed.locator('.discord-mention')).toHaveText('@Staff');
	});
});

test.describe('panel preview', () => {
	async function pickCategory(page) {
		await page.locator('input[autocomplete]').first().click();
		await page.getByRole('option', { name: /Support/ }).click();
	}

	test('buttons in classic embeds', async ({ page, issues }) => {
		await page.goto(panelsPath);
		await page.waitForLoadState('networkidle');
		const preview = panel(page);
		await expect(preview).toHaveAttribute('data-preview-layout', 'embed');
		await page.getByLabel('Title').fill('Need help?');
		await page.getByLabel('Description').fill('Pick a **category**');
		await pickCategory(page);
		const embed = preview.locator('[data-preview="embed"]');
		await expect(embed).toContainText('Need help?');
		await expect(embed.locator('strong')).toHaveText('category');
		await expect(embed).toContainText('Discord Tickets');
		await expect(preview.locator('[data-preview="buttons"]')).toHaveText(/🎫\s*Support/);
		expect(issues.errors).toEqual([]);
	});

	test('select menu in the new layout', async ({ page, context, baseURL }) => {
		await useNewLayout(context, baseURL);
		await page.goto(panelsPath);
		await page.waitForLoadState('networkidle');
		const preview = panel(page);
		await expect(preview).toHaveAttribute('data-preview-layout', 'v2');
		await page.getByRole('combobox').first().selectOption('MENU');
		await page.getByLabel('Title').fill('Need help?');
		await page.getByLabel(/^Small image/).fill('https://example.com/t.png');
		await pickCategory(page);
		const container = preview.locator('[data-preview="container"]');
		await expect(container.locator('h2')).toHaveText('Need help?');
		await expect(container.locator('img[src="https://example.com/t.png"]')).toHaveCount(1);
		const menu = container.locator('[data-preview="menu"]');
		await expect(menu).toContainText('Select a ticket category');
		await menu.locator('summary').click();
		await expect(menu.getByText('Get help')).toBeVisible();
	});
});

test.describe('previews escape HTML', () => {
	test('category previews', async ({ page, issues }) => {
		await page.goto(categoryPath);
		await page.waitForLoadState('networkidle');
		await page
			.getByRole('textbox', { name: /^Opening message/ })
			.fill(`${PAYLOAD} [x](javascript:alert(1)) ![i](javascript:alert(1))`);
		await page.getByRole('textbox', { name: /^Image/ }).fill('javascript:alert(1)');
		for (const style of ['EMBED', 'TEXT']) {
			await page.getByRole('combobox', { name: /^Style/ }).selectOption(style);
			await expect(opening(page)).toContainText('<img src=x');
		}
		await page.waitForTimeout(200);
		expect(issues.dialogs).toEqual([]);
		await expect(page.locator('img[src="x"]')).toHaveCount(0);
		await expect(page.locator('a[href^="javascript:"], img[src^="javascript:"]')).toHaveCount(0);
	});

	test('panel preview', async ({ page, context, baseURL, issues }) => {
		for (const v2 of [false, true]) {
			if (v2) await useNewLayout(context, baseURL);
			await page.goto(panelsPath);
			await page.waitForLoadState('networkidle');
			await page.getByLabel('Title').fill(PAYLOAD);
			await page.getByLabel('Description').fill(`${PAYLOAD} [x](javascript:alert(1))`);
			await page.getByLabel(/^Large image/).fill('javascript:alert(1)');
			await expect(panel(page)).toContainText('<img src=x');
			await page.waitForTimeout(200);
			expect(issues.dialogs).toEqual([]);
			await expect(page.locator('img[src="x"]')).toHaveCount(0);
			await expect(page.locator('a[href^="javascript:"], img[src^="javascript:"]')).toHaveCount(0);
		}
	});
});
