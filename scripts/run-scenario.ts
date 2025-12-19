import { chromium } from '@playwright/test'

const TEST_EMAIL = 'claude-test@bloom.wunderkind.world'
const TEST_PASSWORD = 'TestPassword123!'
const ALEX_ID = '6e702a66-e366-4bb7-8eae-e62cae2b13a0'

const SCENARIO_MESSAGE = `Alex just completely lost it in class. We were transitioning from math to reading circle and he refused to put away his math worksheet. I told him he needs to join the group and he said "You can't make me." I gave him a warning that if he doesn't come to the circle he'll lose recess, and now he's under his desk screaming that I'm "the worst teacher" and throwing pencils. The other kids are getting scared. He's been under there for about 3 minutes now and every time I approach he screams louder. I don't know what to do - should I remove the other kids? Try to talk to him? Call the office? I'm afraid if I touch him it'll make things worse. Please help, this is happening RIGHT NOW.`

async function runScenario() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Collect console logs
  const consoleLogs: string[] = []
  page.on('console', msg => {
    consoleLogs.push(msg.text())
  })

  // Track API requests
  const apiCalls: { url: string, body?: any }[] = []
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      const body = request.postData()
      apiCalls.push({
        url: request.url(),
        body: body ? JSON.parse(body) : undefined
      })
    }
  })

  console.log('🔐 Logging in...')
  await page.goto('https://bloom.wunderkind.world/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/chat/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  console.log('✅ Logged in')

  // Select Alex from child selector
  console.log('👦 Selecting Alex...')

  // Click the child selector dropdown
  const childSelector = page.locator('button:has-text("Select child")').first()
  if (await childSelector.isVisible()) {
    await childSelector.click()
  } else {
    // Maybe a child is already selected, click it to open dropdown
    const currentChild = page.locator('header button').filter({ hasText: /.+/ }).first()
    await currentChild.click()
  }

  // Wait for dropdown and click Alex
  await page.waitForTimeout(500)
  await page.click('text=Alex')
  console.log('✅ Selected Alex')

  // Wait for page to settle
  await page.waitForTimeout(1000)

  // Send the scenario message
  console.log('📝 Sending crisis message...')
  const textarea = page.locator('textarea')
  await textarea.fill(SCENARIO_MESSAGE)
  await page.click('button[aria-label="Send message"]')

  // Wait for response to complete
  console.log('⏳ Waiting for AI response...')

  // Wait for tool call badges to appear (if any)
  await page.waitForTimeout(2000)

  // Check for tool badges
  const toolBadges = await page.locator('.bg-blue-50.text-blue-700, .bg-emerald-50.text-emerald-700').allTextContents()

  // Wait for "Thinking..." to disappear (response complete)
  await page.locator('text=Thinking...').waitFor({ state: 'hidden', timeout: 120000 })
  console.log('✅ Response complete')

  // Get the full response - assistant messages have justify-start class
  const assistantMessages = page.locator('.justify-start .bg-white.border')
  const lastAssistant = assistantMessages.last()
  await lastAssistant.waitFor({ state: 'visible', timeout: 10000 })
  const responseHTML = await lastAssistant.innerHTML()
  const responseText = await lastAssistant.innerText()

  // Output results
  console.log('\n' + '='.repeat(80))
  console.log('📊 SCENARIO RESULTS')
  console.log('='.repeat(80))

  console.log('\n🔧 TOOL CALLS DETECTED:')
  if (toolBadges.length > 0) {
    toolBadges.forEach(badge => console.log('  •', badge))
  } else {
    console.log('  (none visible)')
  }

  console.log('\n📋 CONSOLE LOGS:')
  consoleLogs.filter(log => log.includes('session') || log.includes('cache') || log.includes('tool')).forEach(log => {
    console.log('  •', log)
  })

  console.log('\n💬 FULL RESPONSE:')
  console.log('-'.repeat(80))
  console.log(responseText)
  console.log('-'.repeat(80))

  console.log('\n🏷️ COMPONENTS USED:')
  const hasUrgent = responseHTML.includes('bg-red-') || responseHTML.includes('urgent')
  const hasScript = responseHTML.includes('bg-blue-') || responseHTML.includes('script')
  const hasLater = responseHTML.includes('collapsible') || responseHTML.includes('later')
  const hasInsight = responseHTML.includes('bg-green-') || responseHTML.includes('insight')

  console.log('  • <urgent>:', hasUrgent ? '✅ YES' : '❌ NO')
  console.log('  • <script>:', hasScript ? '✅ YES' : '❌ NO')
  console.log('  • <later>:', hasLater ? '✅ YES' : '❌ NO')
  console.log('  • <insight>:', hasInsight ? '✅ YES' : '❌ NO')

  await browser.close()

  console.log('\n✅ Scenario complete!')
}

runScenario().catch(console.error)
