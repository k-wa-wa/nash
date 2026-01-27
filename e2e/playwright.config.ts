import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    timeout: 60 * 1000,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    use: {
        baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        headless: !!process.env.CI,
        launchOptions: {
            slowMo: process.env.CI ? undefined : 100,
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
