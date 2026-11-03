import { test, expect } from './helpers.js';
import { GUILD_ID } from './fixtures.js';

const path = `/settings/${GUILD_ID}/panels`;

/** the panel POSTs the mock API received after `before` */
async function panelPosts(request, before) {
	const requests = (await (await request.get('/__requests')).json()).slice(before);
	return requests
		.filter((r) => r.method === 'POST' && r.path === `/api/admin/guilds/${GUILD_ID}/panels`)
		.map((r) => JSON.parse(r.body));
}

async function fillPanel(page) {
	await page.getByRole('combobox').first().selectOption('MENU');
	const categories = page.locator('input[autocomplete]').first();
	await categories.click();
	await page.getByRole('option', { name: /Support/ }).click();
	await page.getByLabel('Title').fill('Need help?');
}

test('updating a panel sends its channel and message from the link', async ({
	page,
	request,
	issues
}) => {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Update an existing panel').check();
	await expect(page.getByRole('heading', { name: 'Update a panel' })).toBeVisible();
	await expect(page.getByText('The channel to send the panel message to')).toHaveCount(0);
	await fillPanel(page);
	await page
		.getByLabel('Panel message link')
		.fill(`https://discord.com/channels/${GUILD_ID}/3/123456789012345678`);
	const before = (await (await request.get('/__requests')).json()).length;
	await page.getByRole('button', { name: 'Update' }).click();
	await expect.poll(async () => (await panelPosts(request, before)).length).toBe(1);
	const [body] = await panelPosts(request, before);
	expect(body).toMatchObject({ channel: '3', message: '123456789012345678', title: 'Need help?' });
	expect(issues.errors).toEqual([]);
});

test('a link to another server is refused before anything is sent', async ({ page, request }) => {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Update an existing panel').check();
	await fillPanel(page);
	await page
		.getByLabel('Panel message link')
		.fill('https://discord.com/channels/111111111111111111/3/123456789012345678');
	const before = (await (await request.get('/__requests')).json()).length;
	await page.getByRole('button', { name: 'Update' }).click();
	await expect(page.getByText('That message is in a different server.')).toBeVisible();
	expect(await panelPosts(request, before)).toEqual([]);
});

test('sending a new panel does not include a message', async ({ page, request }) => {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
	await fillPanel(page);
	const before = (await (await request.get('/__requests')).json()).length;
	await page.getByRole('button', { name: 'Create' }).click();
	await expect.poll(async () => (await panelPosts(request, before)).length).toBe(1);
	const [body] = await panelPosts(request, before);
	expect(body.channel).toBeNull();
	expect(body.message).toBeUndefined();
});

test('the panels page shows which layout panels use', async ({ page }) => {
	await page.goto(path);
	await expect(page.getByTestId('panel-layout')).toContainText('Classic embeds');
});

test('turning on the new layout shows it is on once saved', async ({ page }) => {
	await page.goto(`/settings/${GUILD_ID}/general`);
	await page.waitForLoadState('networkidle');
	const status = page.getByTestId('layout-status');
	await expect(status).toContainText('Off');
	await page.getByLabel(/Use Discord's new message layout/).check();
	// not on until it's saved
	await expect(status).toContainText('Off');
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(status).toContainText('On for this server.');
	await expect(status.getByRole('link', { name: /update it on the Panels page/ })).toBeVisible();
});
