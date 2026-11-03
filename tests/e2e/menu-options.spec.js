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

test('options need a label', async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.getByRole('button', { name: 'Add' }).click();
	await dialog.locator('input[type=text]').nth(0).fill('  ');
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog.getByRole('alert')).toHaveText('Every option needs a label.');
	await expect(dialog).toBeVisible();
});

test('option labels must be different', async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.getByRole('button', { name: 'Add' }).click();
	await dialog.locator('input[type=text]').nth(0).fill('Alpha ');
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog.getByRole('alert')).toHaveText(
		'Two options are called "Alpha". Each option needs a different label.'
	);
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

	await page.getByRole('button', { name: 'Save category' }).click();
	let patch;
	await expect
		.poll(async () => {
			const requests = (await (await request.get('/__requests')).json()).slice(before);
			patch ??= requests.find(
				(r) =>
					r.method === 'PATCH' &&
					r.path.endsWith(`/categories/${CATEGORY_ID}`) &&
					JSON.parse(r.body).questions?.[0]?.options?.length === 1
			);
			return !!patch;
		})
		.toBe(true);
	const [question] = JSON.parse(patch.body).questions;
	expect(question.options.map((o) => o.label)).toEqual(['Beta']);
	expect(question.options[0]).toMatchObject({ label: 'Beta', description: '', emoji: '' });
	// a menu can't require more choices than it has options
	expect(question.maxLength).toBeLessThanOrEqual(1);
	expect(question.minLength).toBeLessThanOrEqual(question.maxLength);
});

test('a menu question can be made optional', async ({ page, request }) => {
	const before = (await (await request.get('/__requests')).json()).length;
	await page.goto(categoryPath);
	await page.waitForLoadState('networkidle');
	const expand = page.getByText('Click to expand').first();
	if (await expand.count()) await expand.click();
	await page.getByRole('checkbox', { name: /^Required/ }).uncheck();
	await page.getByRole('button', { name: 'Save category' }).click();
	let patch;
	await expect
		.poll(async () => {
			const requests = (await (await request.get('/__requests')).json()).slice(before);
			patch ??= requests.find(
				(r) =>
					r.method === 'PATCH' &&
					r.path.endsWith(`/categories/${CATEGORY_ID}`) &&
					JSON.parse(r.body).questions?.[0]?.required === false
			);
			return !!patch;
		})
		.toBe(true);
});
