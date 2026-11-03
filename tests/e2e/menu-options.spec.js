import { test, expect } from './helpers.js';
import { GUILD_ID, CATEGORY_ID } from './fixtures.js';

const categoryPath = `/settings/${GUILD_ID}/categories/${CATEGORY_ID}`;

async function openEditor(page) {
	await page.goto(categoryPath);
	await page.waitForLoadState('networkidle');
	const expand = page.getByText('Click to expand').first();
	if (await expand.count()) await expand.click();
	await page.getByRole('button', { name: 'Edit' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

const listedOptions = (page) => page.locator('ul.list-inside li');

test('edit, add, reorder and remove menu options', async ({ page, issues }) => {
	const dialog = await openEditor(page);
	await expect(dialog.getByText('Options (2/25)')).toBeVisible();

	await dialog.getByRole('button', { name: 'Add' }).click();
	const inputs = dialog.locator('input[type=text]');
	await inputs.nth(0).fill('Gamma');
	await inputs.nth(3).fill('g');
	await dialog.getByRole('button', { name: 'Move Gamma up' }).click();
	await dialog.getByRole('button', { name: 'Remove Alpha' }).click();
	await dialog.getByRole('button', { name: 'Save' }).click();

	await expect(dialog).toBeHidden();
	await expect(listedOptions(page)).toHaveText(['Gamma', 'Beta']);
	expect(issues.errors).toEqual([]);
});

test('cancel discards changes', async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.getByRole('button', { name: 'Remove Alpha' }).click();
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).toBeHidden();
	await expect(listedOptions(page)).toHaveText(['Alpha', 'Beta']);
});

test('options need a label and a value', async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.getByRole('button', { name: 'Add' }).click();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog.getByRole('alert')).toHaveText('Every option needs a label and a value.');
	await expect(dialog).toBeVisible();
});

test('at least one option is required', async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.getByRole('button', { name: 'Remove Alpha' }).click();
	await dialog.getByRole('button', { name: 'Remove Beta' }).click();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog.getByRole('alert')).toHaveText('Add at least one option.');
});

test('saved options are sent to the API', async ({ page, request }) => {
	const before = (await (await request.get('/__requests')).json()).length;
	const dialog = await openEditor(page);
	await dialog.getByRole('button', { name: 'Remove Alpha' }).click();
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).toBeHidden();

	await page.getByRole('button', { name: 'Submit' }).click();
	let patch;
	await expect
		.poll(async () => {
			const requests = (await (await request.get('/__requests')).json()).slice(before);
			patch ??= requests.find((r) => r.method === 'PATCH');
			return !!patch;
		})
		.toBe(true);
	const [question] = JSON.parse(patch.body).questions;
	expect(question.options.map((o) => o.label)).toEqual(['Beta']);
	expect(question.options[0]).toMatchObject({ value: 'b', description: '', emoji: '' });
	// a menu can't require more choices than it has options
	expect(question.maxLength).toBeLessThanOrEqual(1);
	expect(question.minLength).toBeLessThanOrEqual(question.maxLength);
});
