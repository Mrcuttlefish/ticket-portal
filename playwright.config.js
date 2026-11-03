import { defineConfig, devices } from '@playwright/test';

const port = 5173;

export default defineConfig({
	testDir: 'tests/e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		// requires `pnpm run build` first
		command: 'node tests/e2e/server.js',
		url: `http://127.0.0.1:${port}/api/client`,
		env: { PORT: String(port), ORIGIN: `http://127.0.0.1:${port}` },
		reuseExistingServer: !process.env.CI
	}
});
