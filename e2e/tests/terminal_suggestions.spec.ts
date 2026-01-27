import { test, expect } from '@playwright/test';

test('Command suggestions should populate input but NOT execute', async ({ page }) => {
    // 1. Setup: Login (using the flow from login.spec.ts)
    await page.goto('/');
    const hostButton = page.getByText('nash-mock-pass');
    await hostButton.click();
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('password');
    await passwordInput.press('Enter');

    // 2. Wait for terminal prompt
    await expect(page.locator('.xterm-rows')).toContainText('$');

    // 3. Trigger suggestions (input "git ")
    const commandInput = page.getByPlaceholder('Type command...');
    await commandInput.fill('git ');

    // 4. Find suggestion button for "status"
    const suggestionBtn = page.getByRole('button', { name: 'status' });
    await expect(suggestionBtn).toBeVisible();

    // 5. Intercept WebSocket messages if possible, OR check if terminal shows output
    // Since intercepting WS is harder in Playwright without plugins, 
    // we can check if the terminal content changes unexpectedly.

    // Record terminal text before click
    const terminalBefore = await page.locator('.xterm-rows').innerText();

    // 6. Click the suggestion
    await suggestionBtn.click();

    // 7. Verify input is populated
    await expect(commandInput).toHaveValue('git status ');

    // 8. Verify NO immediate execution (terminal should NOT contain result of "git status")
    // If it executed, we would see "On branch" or "nothing to commit" etc.
    // Let's wait a bit to be sure.
    await page.waitForTimeout(1000);

    const terminalAfter = await page.locator('.xterm-rows').innerText();

    // It should not have changed much (only maybe a redraw, but NOT execution output)
    expect(terminalAfter).not.toContain('On branch');
    expect(terminalAfter).not.toContain('nothing to commit');
});
