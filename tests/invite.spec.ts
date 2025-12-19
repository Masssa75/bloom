import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'claude-test@bloom.wunderkind.world';
const TEST_PASSWORD = 'TestPassword123!';
const INVITE_EMAIL = 'invite-test@bloom.wunderkind.world';

test.describe('Invite Collaborator Flow', () => {
  test('should be able to invite a collaborator', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    // Login
    await page.goto('https://bloom.wunderkind.world/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // App redirects to /chat after login
    await expect(page).toHaveURL(/\/chat/, { timeout: 10000 });
    console.log('Logged in');

    // First create a test child so we're guaranteed to be the owner
    await page.goto('https://bloom.wunderkind.world/child/new');
    await page.fill('input[placeholder="Enter name"]', 'Invite Test Child');
    await page.fill('input[placeholder="Enter age"]', '6');
    await page.click('button[type="submit"]');

    // Should redirect to the new child's profile
    await expect(page).toHaveURL(/\/child\/[a-f0-9-]+/, { timeout: 10000 });
    console.log('Created test child, on profile');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for Collaborators section (only visible if we're the owner)
    const collaboratorsHeading = page.getByRole('heading', { name: 'Collaborators' });
    await expect(collaboratorsHeading).toBeVisible({ timeout: 10000 });
    console.log('Collaborators section visible');

    // Click Invite button
    await page.getByText('+ Invite').click();
    console.log('Clicked invite button');

    // Fill in email
    const emailInput = page.locator('input[type="email"][placeholder*="colleague"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(INVITE_EMAIL);
    console.log('Filled email');

    // Select role (member)
    await page.selectOption('select', 'member');
    console.log('Selected role');

    // Submit invitation
    await page.click('text=Send Invite');
    console.log('Clicked send invite');

    // Should see success message or pending invitation
    await page.waitForTimeout(2000);

    // Check for success message or pending invitation entry
    const hasSuccess = await page.locator('text=Invitation sent').isVisible().catch(() => false);
    const hasPending = await page.locator(`text=${INVITE_EMAIL}`).isVisible().catch(() => false);
    const hasError = await page.locator('.bg-red-50').isVisible().catch(() => false);

    if (hasError) {
      const errorText = await page.locator('.bg-red-50').textContent();
      console.log('Error:', errorText);
      // If already invited, that's okay
      if (errorText?.includes('already exists')) {
        console.log('Invitation already exists - test still passes');
        return;
      }
    }

    expect(hasSuccess || hasPending).toBe(true);
    console.log('Successfully invited collaborator!');
  });
});
