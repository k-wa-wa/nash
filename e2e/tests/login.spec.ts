import { test, expect } from '@playwright/test';

test('Password authentication login flow', async ({ page }) => {
    // 1. Open the application
    await page.goto('/');

    // 2. Select the password auth host
    // Assuming the host list is rendered using list items or buttons.
    // We'll search for the host name "nash-mock-pass".
    const hostButton = page.getByText('nash-mock-pass');
    await expect(hostButton).toBeVisible();
    await hostButton.click();

    // 3. Wait for password modal
    // Assumes there is an input field for password.
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // 4. Enter password
    await passwordInput.fill('password');
    await passwordInput.press('Enter');

    // 5. Verify connection
    // Wait for the terminal to appear. 
    // xterm.js usually creates a .xterm-screen element.
    // Also we can check for "Connected" text if UI shows it, or just the shell prompt.
    // Let's assume the terminal rows are visible.
    await expect(page.locator('.xterm-rows')).toBeVisible();

    // 6. Execute command
    // Wait for the prompt to appear in the terminal rows
    await expect(page.locator('.xterm-rows')).toContainText('$');

    // Click on the command input to ensure it has focus
    const commandInput = page.getByPlaceholder('Type command...');
    await commandInput.click();

    // Type the command
    const command = 'echo "hello from playwright"';
    await commandInput.pressSequentially(command, { delay: 100 });
    await commandInput.press('Enter');

    // 7. Verify command output
    // Wait for the output to appear in the terminal
    await expect(page.locator('.xterm-rows')).toContainText('hello from playwright');
});
