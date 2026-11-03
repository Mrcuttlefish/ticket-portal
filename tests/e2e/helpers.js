import { test as base, expect } from '@playwright/test';

/**
 * A page that records uncaught errors, CSP violations and any dialog (alert/confirm),
 * so tests can assert the page ran cleanly and no injected script fired.
 */
export const test = base.extend({
	context: async ({ context, baseURL }, use) => {
		// skip the first-visit welcome modal and cookie banner
		await context.addCookies([
			{ name: 'welcomed', value: 'true', url: baseURL },
			{ name: 'dismissedCookies', value: 'true', url: baseURL }
		]);
		await use(context);
	},
	issues: async ({ page }, use) => {
		const issues = { errors: [], csp: [], dialogs: [] };
		page.on('pageerror', (e) => issues.errors.push(e.message));
		page.on('console', (m) => {
			if (/Content Security Policy/i.test(m.text())) issues.csp.push(m.text());
		});
		page.on('dialog', (d) => {
			issues.dialogs.push(d.message());
			d.dismiss();
		});
		await use(issues);
	}
});

export { expect };
