import { test, expect } from './helpers.js';
import { CLOSABLE_TICKET, CLOSED_TICKET, GUILD_ID, OPEN_TICKET } from './fixtures.js';

const slug = BigInt(GUILD_ID).toString(36);
const ticketsPath = `/${slug}/tickets`;

test('the home page goes straight to the only server', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(new RegExp(`${ticketsPath}$`));
});

test('the server page redirects to tickets', async ({ page }) => {
	await page.goto(`/${slug}`);
	await expect(page).toHaveURL(new RegExp(`${ticketsPath}$`));
});

test.describe('ticket list', () => {
	test('shows open tickets by default', async ({ page, issues }) => {
		await page.goto(ticketsPath);
		const items = page.getByRole('list', { name: 'Tickets' }).getByRole('listitem');
		await expect(items).toHaveCount(2);
		await expect(items.first()).toContainText('#13');
		await expect(items.first()).toContainText('Open');
		expect(issues.errors).toEqual([]);
		expect(issues.csp).toEqual([]);
	});

	test('filters by status', async ({ page }) => {
		await page.goto(ticketsPath);
		await page.getByRole('tab', { name: 'Closed' }).click();
		await expect(page).toHaveURL(/status=closed/);
		const items = page.getByRole('list', { name: 'Tickets' }).getByRole('listitem');
		await expect(items).toHaveCount(1);
		// the topic is shown as text, not HTML
		await expect(items.first()).toContainText('Refund <img src=x onerror=alert(1)>');
		await expect(page.locator('img[src="x"]')).toHaveCount(0);
	});

	test('searches', async ({ page }) => {
		await page.goto(`${ticketsPath}?status=all`);
		await page.getByRole('searchbox', { name: 'Search tickets' }).fill('log in');
		await page.getByRole('button', { name: 'Search' }).click();
		await expect(page).toHaveURL(/q=log\+in/);
		await expect(page.getByRole('list', { name: 'Tickets' }).getByRole('listitem')).toHaveCount(1);
	});

	test('shows an empty state', async ({ page }) => {
		await page.goto(`${ticketsPath}?q=nothing-matches`);
		await expect(page.getByText('No open tickets matching "nothing-matches".')).toBeVisible();
	});
});

test.describe('transcript', () => {
	test('renders messages safely', async ({ page, issues }) => {
		await page.goto(`${ticketsPath}/${OPEN_TICKET}`);
		const log = page.getByRole('log', { name: 'Messages' });
		await expect(log.getByRole('article')).toHaveCount(3);
		// markdown and mentions
		await expect(log.locator('strong', { hasText: 'cannot' })).toBeVisible();
		await expect(log).toContainText('@Helpful Staff');
		// embeds
		await expect(log).toContainText('Password reset');
		// raw HTML and javascript: links are not rendered
		await expect(log).toContainText('<script>alert(1)</script>');
		await expect(log.locator('script')).toHaveCount(0);
		await expect(log.locator('a[href^="javascript:"]')).toHaveCount(0);
		// attachments: image inline, expired file marked
		await expect(log.getByRole('img', { name: 'screenshot.png' })).toBeVisible();
		await expect(log).toContainText('log.txt');
		await expect(log).toContainText('(link expired)');
		// edited / deleted / via web
		await expect(log).toContainText('(edited)');
		await expect(log).toContainText('(deleted)');
		await expect(log).toContainText('Web');
		// sidebar
		await expect(page.getByText('me@example.com')).toBeVisible();
		await expect(page.locator('aside')).toContainText('Helpful Staff');
		expect(issues.dialogs).toEqual([]);
		expect(issues.errors).toEqual([]);
		expect(issues.csp).toEqual([]);
	});

	test('closed tickets are read-only', async ({ page }) => {
		await page.goto(`${ticketsPath}/${CLOSED_TICKET}`);
		await expect(page.getByTestId('ticket-status')).toHaveText('Closed');
		await expect(page.getByLabel('Reply')).toHaveCount(0);
		await expect(page.getByText('This is the archived transcript.')).toBeVisible();
	});

	test('unknown tickets 404', async ({ page }) => {
		const response = await page.goto(`${ticketsPath}/399999999999999999`);
		expect(response.status()).toBe(404);
	});

	test('non-ID ticket paths do not match', async ({ request }) => {
		expect((await request.get(`${ticketsPath}/abc`)).status()).toBe(404);
	});
});

test.describe('replying', () => {
	test('sends a reply as JSON and shows it', async ({ page, request }) => {
		await page.goto(`${ticketsPath}/${OPEN_TICKET}`);
		await expect(page.getByText('Live')).toBeVisible();
		const text = `Hello from the web ${Date.now()}`;
		await page.getByLabel('Reply').fill(text);
		await page.getByRole('button', { name: 'Send' }).click();
		const log = page.getByRole('log', { name: 'Messages' });
		// shown once, even though it also arrives over the live stream
		await expect(log.getByText(text)).toHaveCount(1);
		await expect(page.getByLabel('Reply')).toHaveValue('');

		const requests = await (await request.get('/__requests')).json();
		const post = requests.find((r) => r.method === 'POST' && r.body?.includes(text));
		expect(post.path).toBe(`/api/guilds/${GUILD_ID}/tickets/${OPEN_TICKET}/messages`);
		expect(JSON.parse(post.body)).toEqual({ content: text });
	});

	test('Ctrl+Enter sends', async ({ page }) => {
		await page.goto(`${ticketsPath}/${OPEN_TICKET}`);
		const text = `Keyboard ${Date.now()}`;
		await page.getByLabel('Reply').fill(text);
		await page.getByLabel('Reply').press('Control+Enter');
		await expect(page.getByRole('log', { name: 'Messages' }).getByText(text)).toHaveCount(1);
	});

	test('the send button is disabled for empty replies', async ({ page }) => {
		await page.goto(`${ticketsPath}/${OPEN_TICKET}`);
		await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
		await page.getByLabel('Reply').fill('   ');
		await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
	});

	test('live messages from Discord appear', async ({ page, request }) => {
		await page.goto(`${ticketsPath}/${OPEN_TICKET}`);
		await expect(page.getByText('Live')).toBeVisible();
		const text = `From Discord ${Date.now()}`;
		await request.post('/__emit', {
			data: {
				ticket: OPEN_TICKET,
				event: 'message',
				data: {
					id: String(Date.now()) + '0000',
					author: { id: '200000000000000001', username: 'helper', displayName: 'Helpful Staff' },
					content: text,
					embeds: [],
					attachments: [],
					createdAt: new Date().toISOString(),
					editedAt: null,
					deleted: false,
					viaWeb: false
				}
			}
		});
		await expect(page.getByRole('log', { name: 'Messages' }).getByText(text)).toBeVisible();
	});
});

test('closing a ticket', async ({ page }) => {
	await page.goto(`${ticketsPath}/${CLOSABLE_TICKET}`);
	await page.getByRole('button', { name: 'Close ticket…' }).click();
	await page.getByLabel('Close this ticket?').fill('Solved');
	await page.getByRole('button', { name: 'Close ticket', exact: true }).click();
	await expect(page.getByTestId('ticket-status')).toHaveText('Closed');
	await expect(page.getByLabel('Reply')).toHaveCount(0);
});
