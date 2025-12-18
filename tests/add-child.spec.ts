import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'claude-test@bloom.wunderkind.world';
const TEST_PASSWORD = 'TestPassword123!';

test.describe('Add Child Flow', () => {
  test('should be able to sign up, login, and add a child', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Go to login page
    await page.goto('https://bloom.wunderkind.world/login');
    await expect(page.locator('h1')).toContainText('Bloom');

    // Sign in
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    console.log('Successfully logged in!');

    // Click Add Child
    await page.click('text=Add Child');
    await expect(page).toHaveURL(/\/child\/new/);
    console.log('On Add Child page');

    // Fill in child details
    await page.fill('input[placeholder="Enter name"]', 'Test Child');
    await page.fill('input[placeholder="Enter age"]', '5');
    await page.fill('textarea', 'Test child created by Playwright');
    console.log('Filled form');

    // Listen for network responses
    page.on('response', async response => {
      if (response.url().includes('supabase')) {
        const status = response.status();
        console.log(`NETWORK: ${response.url()} - ${status}`);
        if (status >= 400) {
          try {
            const body = await response.json();
            console.log('ERROR BODY:', JSON.stringify(body));
          } catch {}
        }
      }
    });

    // Submit
    console.log('Clicking submit...');
    await page.click('button[type="submit"]');

    // Should redirect to child profile
    await expect(page).toHaveURL(/\/child\/[a-f0-9-]+/, { timeout: 10000 });
    console.log('Successfully redirected to child profile!');

    // Verify child name is displayed
    await expect(page.locator('h1')).toContainText('Test Child');
    console.log('Successfully added child!');
  });
});
