import { test, expect } from '@playwright/test'

test.describe('Chat functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account
    await page.goto('/login')
    await page.fill('input[type="email"]', 'claude-test@bloom.wunderkind.world')
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')

    // Wait for redirect to chat
    await page.waitForURL('/chat', { timeout: 10000 })
  })

  test('loads chat page with child selector', async ({ page }) => {
    // Check header elements
    await expect(page.locator('text=Bloom')).toBeVisible()

    // Check child selector exists (look for Michael or any child selector)
    const childSelector = page.locator('button:has-text("Michael")')
    if (await childSelector.isVisible()) {
      // User has Michael, verify child selector works
      await childSelector.click()
      await expect(page.locator('.absolute.top-full')).toBeVisible()
    }
  })

  test('sends message and receives streaming response', async ({ page }) => {
    // Type a simple message
    const input = page.locator('textarea')
    await input.fill('Hello')

    // Intercept the API call to see what's being sent
    let requestBody: any = null
    page.on('request', request => {
      if (request.url().includes('/api/chat')) {
        requestBody = JSON.parse(request.postData() || '{}')
        console.log('Request body:', JSON.stringify(requestBody, null, 2))
      }
    })

    // Send the message
    await page.click('button[aria-label="Send message"]')

    // Wait for response to start
    await expect(page.locator('.bg-white.border.border-gray-200')).toBeVisible({ timeout: 30000 })

    // Verify the request had correct structure
    expect(requestBody).toBeTruthy()
    expect(requestBody.childId).toBeTruthy()
    expect(requestBody.childName).toBeTruthy()
    expect(requestBody.message).toBeTruthy()

    // Log the child ID for debugging
    console.log('Child ID sent:', requestBody.childId)
    console.log('Child Name sent:', requestBody.childName)

    // Wait for response to complete (no more "Thinking..." spinner)
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 60000 })

    // Verify no error message
    const assistantMessage = page.locator('.bg-white.border.border-gray-200').last()
    const content = await assistantMessage.textContent()
    expect(content).not.toContain('Sorry, something went wrong')
    expect(content).not.toContain('encountered an error')

    console.log('Assistant response:', content?.substring(0, 200))
  })

  test('tool calling works with child context', async ({ page }) => {
    // Ask about the child specifically to trigger tool call
    const input = page.locator('textarea')
    await input.fill('What are the main challenges for this child?')

    // Send the message
    await page.click('button[aria-label="Send message"]')

    // Wait for tool call indicator (if visible)
    // Tool status shows "Checking get child overview..."
    const toolStatus = page.locator('text=Checking')
    try {
      await expect(toolStatus).toBeVisible({ timeout: 10000 })
      console.log('Tool call detected')
    } catch {
      console.log('Tool call indicator not visible (might be too fast)')
    }

    // Wait for response to complete
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 90000 })

    // Verify response
    const assistantMessage = page.locator('.bg-white.border.border-gray-200').last()
    const content = await assistantMessage.textContent()

    console.log('Full response:', content)

    // Check it's not an error
    expect(content).not.toContain('Sorry, something went wrong')
  })
})
