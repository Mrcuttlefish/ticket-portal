import { test, expect } from './helpers.js';
import { GUILD_ID, CATEGORY_ID } from './fixtures.js';

/** Submit the page's form and return the parsed body of the request it sends. */
async function submitAndCapture(page, request, pathSuffix, button, method = 'PATCH') {
	const before = (await (await request.get('/__requests')).json()).length;
	await page.getByRole('button', { name: button }).click();
	let sent;
	await expect
		.poll(async () => {
			const requests = (await (await request.get('/__requests')).json()).slice(before);
			sent ??= requests.find((r) => r.method === method && r.path.endsWith(pathSuffix));
			return !!sent;
		})
		.toBe(true);
	return JSON.parse(sent.body);
}

test.describe('Ticket Tool parity (P3)', () => {
	test('category: thread tickets, what happens when the creator leaves, and automations', async ({
		page,
		request,
		issues
	}) => {
		await page.goto(`/settings/${GUILD_ID}/categories/${CATEGORY_ID}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByLabel('Thread channel')).toHaveCount(0);
		await page.getByLabel('Tickets are').selectOption('THREAD');
		await page.getByLabel('Thread channel').selectOption('3');
		await page.getByLabel('When the creator leaves the server').selectOption('KEEP');
		await page.getByRole('button', { name: 'Add automation' }).click();
		await page.getByLabel('Automation 1: after').fill('2h');
		await page.getByLabel('Automation 1: tag').selectOption('refunds');
		await page.getByRole('button', { name: 'Add automation' }).click();
		await page.getByLabel('Automation 2: waiting for').selectOption('CREATOR');
		await page.getByLabel('Automation 2: after').fill('3d');
		await page.getByLabel('Automation 2: action').selectOption('CLOSE');
		const body = await submitAndCapture(
			page,
			request,
			`/categories/${CATEGORY_ID}`,
			'Save category'
		);
		expect(body).toMatchObject({
			automations: [
				{ action: 'TAG', after: 7_200_000, tag: 'refunds', waitingOn: 'STAFF' },
				{ action: 'CLOSE', after: 3 * 86_400_000, waitingOn: 'CREATOR' }
			],
			channelType: 'THREAD',
			onCreatorLeave: 'KEEP',
			threadParent: '3'
		});
		expect(body.automations[1]).not.toHaveProperty('tag');
		expect(issues.errors).toEqual([]);
	});

	test('category: the defaults keep the old behaviour', async ({ page, request }) => {
		await page.goto(`/settings/${GUILD_ID}/categories/${CATEGORY_ID}`);
		await page.waitForLoadState('networkidle');
		const body = await submitAndCapture(
			page,
			request,
			`/categories/${CATEGORY_ID}`,
			'Save category'
		);
		expect(body).toMatchObject({
			automations: [],
			channelType: 'CHANNEL',
			onCreatorLeave: 'CLOSE',
			threadParent: null
		});
	});

	test('general: dashboard roles and who can use each button', async ({ page, request }) => {
		await page.goto(`/settings/${GUILD_ID}/general`);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('Dashboard roles').selectOption(['11']);
		await page.getByText('Who can use it').nth(3).click(); // close
		await page.getByLabel('Close button: not these roles').selectOption(['12']);
		const body = await submitAndCapture(page, request, '/settings', 'Save changes');
		expect(body.dashboardRoles).toEqual(['11']);
		expect(body.buttons).toEqual({ close: { deny: ['12'] } });
	});

	test('tags: wildcard triggers and DMs are saved', async ({ page, request }) => {
		await page.goto(`/settings/${GUILD_ID}/tags`);
		await page.waitForLoadState('networkidle');
		await page.getByText('Click to expand').first().click();
		const form = page.locator('form#\\31 ');
		await form.getByLabel('Trigger type').selectOption('WILDCARD');
		await form.getByRole('checkbox', { name: /Send in a DM/ }).check();
		const before = (await (await request.get('/__requests')).json()).length;
		await form.evaluate((f) => f.requestSubmit());
		let patch;
		await expect
			.poll(async () => {
				const requests = (await (await request.get('/__requests')).json()).slice(before);
				patch ??= requests.find((r) => r.method === 'PATCH' && r.path.endsWith('/tags/1'));
				return !!patch;
			})
			.toBe(true);
		const body = JSON.parse(patch.body);
		expect(body.matchType).toBe('WILDCARD');
		expect(body.autoDm).toBe(true);
	});

	test('statistics: totals, a chart with a hover tooltip and a table, and staff counts', async ({
		page,
		issues
	}) => {
		await page.goto(`/settings/${GUILD_ID}/statistics`);
		await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
		await expect(page.getByText('Opened', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('21', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('12m')).toBeVisible();
		await expect(
			page.getByRole('img', { name: 'Tickets opened and closed per day' })
		).toBeVisible();
		const chart = page.getByRole('img', { name: 'Tickets opened and closed per day' });
		const box = await chart.boundingBox();
		await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
		await expect(page.getByText('Opened: 6')).toBeVisible();
		await page.getByText('Show as a table').click();
		await expect(page.getByRole('cell', { name: '2026-11-14' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'Alex' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'Deleted category' })).toBeVisible();
		await page.getByRole('link', { name: '90 days' }).click();
		await expect(page).toHaveURL(/days=90/);
		expect(issues.errors).toEqual([]);
	});

	test('history: changes are listed (escaped), filtered and paged', async ({ page, issues }) => {
		await page.goto(`/settings/${GUILD_ID}/history`);
		await expect(page.getByText('changed category')).toBeVisible();
		await page.getByText('1 change').click();
		// values are shown as text, never as HTML
		await expect(page.getByRole('cell', { name: '<b>Help</b>' })).toBeVisible();
		await page.getByRole('link', { name: 'Older changes' }).click();
		await expect(page.getByText('changed the settings')).toBeVisible();
		await page.goto(`/settings/${GUILD_ID}/history?type=settings`);
		await expect(page.getByText('changed the settings')).toBeVisible();
		await expect(page.getByText('changed category')).toHaveCount(0);
		expect(issues.errors).toEqual([]);
	});
});
