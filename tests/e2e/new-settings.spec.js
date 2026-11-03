import { test, expect } from './helpers.js';
import { GUILD_ID, CATEGORY_ID } from './fixtures.js';

/** Submit the page's form and return the parsed body of the PATCH it sends. */
async function submitAndCapture(page, request, pathSuffix, button = 'Save category') {
	const before = (await (await request.get('/__requests')).json()).length;
	await page.getByRole('button', { name: button }).click();
	let patch;
	await expect
		.poll(async () => {
			const requests = (await (await request.get('/__requests')).json()).slice(before);
			patch ??= requests.find((r) => r.method === 'PATCH' && r.path.endsWith(pathSuffix));
			return !!patch;
		})
		.toBe(true);
	return JSON.parse(patch.body);
}

test.describe('general settings', () => {
	const path = `/settings/${GUILD_ID}/general`;

	test('saves unchanged settings without breaking anything', async ({ page, request, issues }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		const body = await submitAndCapture(page, request, '/settings', 'Save changes');
		// days off are sent as 00:00-00:00, never null
		expect(body.workingHours).toEqual([
			'Europe/London',
			['00:00', '00:00'],
			['09:00', '17:00'],
			['09:00', '17:00'],
			['00:00', '00:00'],
			['00:00', '00:00'],
			['00:00', '00:00'],
			['00:00', '00:00']
		]);
		// the masked secret is sent back unchanged so the bot keeps it
		expect(body.webhookSecret).toBe('********');
		expect(body.webhookUrl).toBe('https://example.com/hook');
		expect(body.holidays).toEqual(['2026-12-25']);
		expect(body.closeRequests).toBe(true);
		expect(body.ghostPing).toBe(false);
		expect(body.componentsV2).toBe(false);
		expect(body.ticketNumberOffset).toBe(0);
		expect(body.autoClose).toBeNull();
		expect(issues.errors).toEqual([]);
	});

	test('new options are saved', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByRole('checkbox', { name: /^Close requests/ }).uncheck();
		await page.getByRole('checkbox', { name: /^Ghost ping/ }).check();
		await page.getByRole('checkbox', { name: /^Use Discord's new message layout/ }).check();
		await page.getByRole('spinbutton', { name: /^Ticket number offset/ }).fill('1000');
		await page.getByRole('textbox', { name: 'Secret' }).fill('s3cret');
		await page.getByLabel('Holiday date').fill('2027-01-01');
		await page.getByRole('button', { name: 'Add holiday' }).click();
		await page.getByRole('button', { name: 'Remove 2026-12-25' }).click();

		const body = await submitAndCapture(page, request, '/settings', 'Save changes');
		expect(body.closeRequests).toBe(false);
		expect(body.componentsV2).toBe(true);
		expect(body.ghostPing).toBe(true);
		expect(body.ticketNumberOffset).toBe(1000);
		expect(body.webhookSecret).toBe('s3cret');
		expect(body.holidays).toEqual(['2027-01-01']);
	});

	test('transcript channel, transcript DMs and logged events are saved', async ({
		page,
		request
	}) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Logged events')).toHaveCount(0);
		await page.getByLabel('Log channel').selectOption('3');
		await page.getByRole('checkbox', { name: 'Tickets claimed', exact: true }).uncheck();
		await page.getByRole('checkbox', { name: 'Settings changes', exact: true }).uncheck();
		await page.getByLabel('Transcript channel').selectOption('3');
		await page.getByRole('checkbox', { name: /Send the transcript to the member/ }).check();
		const body = await submitAndCapture(page, request, '/settings', 'Save changes');
		expect(body.logChannel).toBe('3');
		expect(body.logExclude).toEqual(['ticket.claim', 'admin']);
		expect(body.transcriptChannel).toBe('3');
		expect(body.transcriptDm).toBe(true);
	});

	test('no transcript channel is sent as null', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		const body = await submitAndCapture(page, request, '/settings', 'Save changes');
		expect(body.transcriptChannel).toBeNull();
		expect(body.transcriptDm).toBe(false);
		expect(body.logExclude).toEqual([]);
	});

	test('saving stays on the page and confirms', async ({ page }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByRole('textbox', { name: /^Footer/ }).fill('Thanks for waiting');
		await expect(page.getByText('You have unsaved changes')).toBeVisible();
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByRole('status')).toContainText('Saved');
		await expect(page).toHaveURL(new RegExp(`${path}$`));
	});

	test('the webhook secret can be removed', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByRole('checkbox', { name: 'Remove the saved secret' }).check();
		const body = await submitAndCapture(page, request, '/settings', 'Save changes');
		expect(body.webhookSecret).toBeNull();
	});

	test('an http webhook URL is rejected before saving', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByPlaceholder('https://example.com/tickets').fill('http://example.com/hook');
		const before = (await (await request.get('/__requests')).json()).length;
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByText('must start with https://')).toBeVisible();
		const requests = (await (await request.get('/__requests')).json()).slice(before);
		expect(requests.find((r) => r.method === 'PATCH')).toBeUndefined();
	});
});

test.describe('category options', () => {
	const path = `/settings/${GUILD_ID}/categories/${CATEGORY_ID}`;

	test('defaults are sent as "use the server setting"', async ({ page, request, issues }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		const body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body).toMatchObject({
			anonymous: false,
			suggestTags: false,
			archive: null,
			autoClose: null,
			blockedRoles: [],
			claimButton: null,
			closeButton: null,
			fallbackCategories: [],
			pingRoleRules: [],
			roleLimits: [],
			staleAfter: null
		});
		expect(issues.errors).toEqual([]);
	});

	test('role limits, ping rules, fallbacks, blocked roles and overrides are saved', async ({
		page,
		request
	}) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByText('More options').click();

		await page.getByRole('button', { name: 'Add role limit' }).click();
		await page.getByLabel('Role for limit 1').selectOption('11');
		await page.getByLabel('Ticket limit 1').fill('3');

		await page.getByRole('button', { name: 'Add ping rule' }).click();
		await page.getByLabel('Creator roles for rule 1').selectOption(['11']);
		await page.getByLabel('Roles to ping for rule 1').selectOption(['10']);

		await page.getByLabel('Fallback categories').selectOption(['2']);
		await page.getByLabel('Blocked roles').selectOption(['12']);
		await page.getByLabel('Archive messages').selectOption('off');
		await page.getByLabel('Claim button').selectOption('on');
		await page.getByRole('textbox', { name: 'Stale after' }).fill('off');
		await page.getByRole('textbox', { name: 'Auto close after' }).fill('12h');

		const body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.roleLimits).toEqual([{ role: '11', limit: 3 }]);
		expect(body.pingRoleRules).toEqual([{ roles: ['11'], ping: ['10'] }]);
		expect(body.fallbackCategories).toEqual(['2']);
		expect(body.blockedRoles).toEqual(['12']);
		expect(body.archive).toBe(false);
		expect(body.claimButton).toBe(true);
		expect(body.closeButton).toBeNull();
		expect(body.staleAfter).toBe(0);
		expect(body.autoClose).toBe(12 * 3600 * 1000);
	});

	test('anonymous staff can be turned on', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('Anonymous staff').check();
		const body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.anonymous).toBe(true);
	});

	test('tag suggestions can be turned on', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('Suggest tags').check();
		const body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.suggestTags).toBe(true);
	});

	test('closed channels, opening style and claiming options default to the old behaviour', async ({
		page,
		request
	}) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		const body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body).toMatchObject({
			keepClosedFor: null,
			openingStyle: 'EMBED',
			claimHide: true,
			claimTakeover: false,
			claimReleaseLocked: false,
			claimedChannelName: null,
			claimedCategory: null
		});
	});

	test('closed channels can be kept, for a while or until deleted', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('When a ticket closes').selectOption('timed');
		await page.getByRole('textbox', { name: /^Delete closed channels after/ }).fill('2d');
		let body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.keepClosedFor).toBe(2 * 86_400_000);

		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('When a ticket closes').selectOption('keep');
		body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.keepClosedFor).toBe(0);
	});

	test('the opening message can be plain text or off', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByRole('combobox', { name: /^Style/ }).selectOption('OFF');
		await expect(page.getByRole('textbox', { name: /^Opening message/ })).toBeDisabled();
		let body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.openingStyle).toBe('OFF');

		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByRole('combobox', { name: /^Style/ }).selectOption('TEXT');
		body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body.openingStyle).toBe('TEXT');
	});

	test('claiming options are shown when claiming is on, and saved', async ({ page, request }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await expect(page.getByLabel('Staff can take over claimed tickets')).toHaveCount(0);
		await page.getByRole('checkbox', { name: /^Claiming/ }).check();
		await page.getByLabel('Hide claimed tickets from other staff').uncheck();
		await page.getByLabel('Staff can take over claimed tickets').check();
		await page.getByLabel('Only the claimer can release').check();
		await page.getByRole('textbox', { name: /^Channel name while claimed/ }).fill('claimed-{num}');
		await page.getByLabel('Move claimed tickets to').selectOption('2');
		const body = await submitAndCapture(page, request, `/categories/${CATEGORY_ID}`);
		expect(body).toMatchObject({
			claiming: true,
			claimHide: false,
			claimTakeover: true,
			claimReleaseLocked: true,
			claimedChannelName: 'claimed-{num}',
			claimedCategory: '2'
		});
	});

	test('the main Discord category is not offered as a fallback', async ({ page }) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await page.getByText('More options').click();
		const values = await page
			.getByLabel('Fallback categories')
			.locator('option')
			.evaluateAll((options) => options.map((o) => o.value));
		expect(values).toEqual(['2']);
	});
});

test('settings navigation highlights the current page', async ({ page }) => {
	await page.goto(`/settings/${GUILD_ID}/general`);
	const nav = page.getByRole('navigation', { name: 'Server settings' });
	await expect(nav.getByRole('link', { name: 'General' })).toHaveAttribute('aria-current', 'page');
	await nav.getByRole('link', { name: 'Categories' }).click();
	await expect(page).toHaveURL(new RegExp(`/settings/${GUILD_ID}/categories$`));
	await expect(nav.getByRole('link', { name: 'Categories' })).toHaveAttribute(
		'aria-current',
		'page'
	);
});

test.describe('tags', () => {
	const path = `/settings/${GUILD_ID}/tags`;

	test('shows how many tickets a tag prevented and never sends the count back', async ({
		page,
		request,
		issues
	}) => {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Prevented 4 tickets')).toBeVisible();
		await expect(page.getByText(/Prevented 0/)).toHaveCount(0);

		const before = (await (await request.get('/__requests')).json()).length;
		await page.getByText('Click to expand').first().click();
		await page.locator('form#\\31 ').evaluate((f) => f.requestSubmit());
		let patch;
		await expect
			.poll(async () => {
				const requests = (await (await request.get('/__requests')).json()).slice(before);
				patch ??= requests.find((r) => r.method === 'PATCH' && r.path.endsWith('/tags/1'));
				return !!patch;
			})
			.toBe(true);
		const body = JSON.parse(patch.body);
		expect(body.name).toBe('password');
		expect(body).not.toHaveProperty('preventedCount');
		expect(issues.errors).toEqual([]);
	});
});
