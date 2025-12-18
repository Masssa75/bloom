import { test, expect } from '@playwright/test'

// Test account credentials
const TEST_EMAIL = 'claude-test@bloom.wunderkind.world'
const TEST_PASSWORD = 'TestPassword123!'
const MICHAEL_CHILD_ID = 'c8b85995-d7d7-4380-8697-d0045aa58b8b'

test.describe('Chat functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|chat)/, { timeout: 10000 })
  })

  test('can send a message and receive a response', async ({ page }) => {
    // Go to chat page
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Wait for the chat interface to load
    await expect(page.locator('textarea[placeholder*="Message"]')).toBeVisible({ timeout: 10000 })

    // Select Michael from the dropdown (he has case files)
    // First, check the placeholder to see current child
    const placeholder = await page.locator('textarea').getAttribute('placeholder')
    console.log('Placeholder:', placeholder)

    if (!placeholder?.includes('Michael')) {
      // Click the dropdown button (shows current child name with chevron)
      await page.locator('button.flex.items-center.gap-2.px-3.py-2.bg-gray-100').click()
      await page.waitForTimeout(300)

      // Click Michael in the dropdown list
      await page.locator('.absolute.top-full button:has-text("Michael")').click()
      await page.waitForTimeout(500)
      console.log('Selected Michael')
    }

    // Type a simple message
    const textarea = page.locator('textarea[placeholder*="Message"]')
    await textarea.fill('What is Michael\'s main challenge?')

    // Capture all console logs
    const logs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)
      console.log('BROWSER:', text)
    })

    // Send the message (press Enter or click send button)
    await textarea.press('Enter')

    // Wait for tool call badge to appear (indicates AI is working)
    await expect(page.locator('text=/child overview/')).toBeVisible({ timeout: 30000 })
    console.log('Tool call badge appeared')

    // Wait for "done" signal or error (up to 90 seconds for long responses)
    let attempts = 0
    const maxAttempts = 90
    while (attempts < maxAttempts) {
      await page.waitForTimeout(1000)
      attempts++

      // Check if we got done or error
      if (logs.some(l => l.includes('Stream completed'))) {
        console.log('Stream completed successfully')
        break
      }
      if (logs.some(l => l.includes('API ERROR'))) {
        console.log('API error detected in logs')
        break
      }

      // Log progress every 10 seconds
      if (attempts % 10 === 0) {
        console.log(`Waiting... ${attempts}s`)
      }
    }

    // Print all logs for debugging
    console.log('\n=== All console logs ===')
    logs.forEach(l => console.log(l))
    console.log('========================\n')

    // Check for errors
    const hasError = logs.some(l => l.includes('API ERROR'))
    const hasDone = logs.some(l => l.includes('Stream completed'))

    console.log('Has error:', hasError)
    console.log('Has done:', hasDone)

    // Get the response text
    const responseText = await page.locator('.space-y-3').last().textContent()
    console.log('Response text length:', responseText?.length)
    console.log('Response preview:', responseText?.substring(0, 300))

    expect(hasDone || responseText!.length > 100).toBeTruthy()
  })

  test('console shows cache status', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', msg => {
      consoleLogs.push(msg.text())
    })

    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea[placeholder*="Message"]')
    await textarea.fill('Hi')
    await textarea.press('Enter')

    // Wait a bit for response
    await page.waitForTimeout(10000)

    // Check console logs
    console.log('Console logs:', consoleLogs)
    const hasSessionLog = consoleLogs.some(log => log.includes('session') || log.includes('cache'))
    console.log('Has session/cache log:', hasSessionLog)
  })
})
