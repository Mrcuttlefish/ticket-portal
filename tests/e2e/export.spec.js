import { test, expect } from './helpers.js';
import { GUILD_ID, user } from './fixtures.js';

const path = `/settings/${GUILD_ID}`;

// these tests change the mock's server owner, so they run one at a time
test.describe.configure({ mode: 'serial' });

async function setOwner(request, ownerId) {
	await request.post('/__owner', { data: { ownerId } });
}

async function openData(page) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Data' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test.afterAll(async ({ request }) => setOwner(request, null));

test('the server owner can download an export', async ({ page, request, issues }) => {
	await setOwner(request, user.id);
	const dialog = await openData(page);
	const download = page.waitForEvent('download');
	await dialog.getByRole('button', { name: /Export \(backup\)/ }).click();
	expect((await download).suggestedFilename()).toBe('tickets-export.zip');
	expect(issues.errors).toEqual([]);
});

test('other admins do not see export or import', async ({ page, request }) => {
	await setOwner(request, '999999999999999999');
	const dialog = await openData(page);
	await expect(dialog.getByRole('button', { name: /Export \(backup\)/ })).toHaveCount(0);
	await expect(dialog.getByRole('button', { name: /Import \(restore\)/ })).toHaveCount(0);
	await expect(
		dialog.getByText('Only the server owner can export or import server data.')
	).toBeVisible();
	// the reset warning doesn't offer a backup they can't make
	await dialog.getByRole('button', { name: /Reset/ }).click();
	await expect(page.getByText('Do you want to export a backup first?')).toHaveCount(0);
});

test('a refused export shows the reason instead of an error page', async ({ page, request }) => {
	await setOwner(request, null); // older bot: no ownerId, so the option is shown
	const dialog = await openData(page);
	await dialog.getByRole('button', { name: /Export \(backup\)/ }).click();
	await expect(dialog.getByRole('alert')).toHaveText("Only the server's owner can do this.");
	await expect(page).toHaveURL(new RegExp(`${path}$`));
});
