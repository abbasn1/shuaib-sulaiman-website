import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173'
const supabaseOrigin = 'https://test.supabase.co'
const userId = '11111111-1111-4111-8111-111111111111'
const salesUserId = '22222222-2222-4222-8222-222222222222'
const quoteId = '33333333-3333-4333-8333-333333333333'

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`

const authUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin2@shuaibsulaiman.com',
  email_confirmed_at: new Date().toISOString(),
  user_metadata: { full_name: 'Secondary Super Admin' },
  app_metadata: { provider: 'email', providers: ['email'] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const users = [
  {
    id: userId,
    full_name: 'Secondary Super Admin',
    email: 'admin2@shuaibsulaiman.com',
    role: 'super_admin',
    is_active: true,
    must_change_password: false,
    last_login_at: new Date().toISOString(),
    created_at: '2026-09-08T21:04:52.000Z',
  },
  {
    id: salesUserId,
    full_name: 'Sales Officer',
    email: 'sales@example.com',
    role: 'sales_officer',
    is_active: true,
    must_change_password: false,
    last_login_at: null,
    created_at: '2026-09-08T20:00:00.000Z',
  },
]

const quotes = [{
  id: quoteId,
  full_name: 'Alice Buyer',
  company_name: 'Alice Imports',
  email: 'alice@example.com',
  phone: '+2348000000000',
  product_name: 'S&S Ginger',
  destination_country: 'United Kingdom',
  message: 'Please quote one container.',
  status: 'new',
  assigned_to: null,
  notification_sent_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}]

const visits = [
  { id: '44444444-4444-4444-8444-444444444441', page_path: '/', referrer: null, user_agent: 'Playwright', created_at: new Date().toISOString() },
  { id: '44444444-4444-4444-8444-444444444442', page_path: '/products', referrer: baseUrl, user_agent: 'Playwright', created_at: new Date().toISOString() },
]

const auditLogs = [{
  id: 1,
  actor_id: userId,
  action: 'user_updated',
  entity_type: 'profile',
  entity_id: salesUserId,
  details: { role: 'sales_officer' },
  created_at: new Date().toISOString(),
}]

let notificationEmail = 'sulaiman_shuaib@yahoo.com'

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

async function installSupabaseMocks(page) {
  await page.route(`${supabaseOrigin}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' })

    if (path === '/auth/v1/token') {
      return json(route, {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        user: authUser,
      })
    }

    if (path === '/auth/v1/user') return json(route, authUser)

    if (path === '/rest/v1/profiles') {
      if (url.searchParams.has('id')) return json(route, users[0])
      return json(route, users)
    }

    if (path === '/rest/v1/quotes') return json(route, quotes)
    if (path === '/rest/v1/visits') return json(route, visits)
    if (path === '/rest/v1/audit_logs') return json(route, auditLogs)

    if (path === '/functions/v1/admin-users') {
      const body = request.postDataJSON() || {}
      if (body.action === 'get-settings') {
        return json(route, { settings: { quoteNotificationEmail: notificationEmail, updatedAt: new Date().toISOString() } })
      }
      if (body.action === 'update-notification-email') {
        notificationEmail = body.email
        auditLogs.unshift({ id: auditLogs.length + 1, actor_id: userId, action: 'contact_notification_email_updated', entity_type: 'app_setting', entity_id: 'quote_notification_email', details: { email: notificationEmail }, created_at: new Date().toISOString() })
        return json(route, { success: true, settings: { quoteNotificationEmail: notificationEmail, updatedAt: new Date().toISOString() } })
      }
      return json(route, { success: true })
    }

    if (path === '/functions/v1/admin-quotes') {
      const body = request.postDataJSON() || {}
      if (body.action === 'update-status') quotes[0].status = body.status
      if (body.action === 'assign') quotes[0].assigned_to = body.assignedTo || null
      quotes[0].updated_at = new Date().toISOString()
      return json(route, { success: true, quote: { id: quoteId, status: quotes[0].status, assigned_to: quotes[0].assigned_to, updated_at: quotes[0].updated_at } })
    }

    return json(route, { error: `Unhandled mocked Supabase request: ${request.method()} ${path}` }, 500)
  })
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const browser = await chromium.launch({ headless: true })
let failures = 0

async function runDashboardTest(viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const errors = []

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })

  try {
    await installSupabaseMocks(page)
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' })
    await page.getByLabel('Email address').fill('admin2@shuaibsulaiman.com')
    await page.getByLabel('Password').fill('TemporaryPassword123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')
    await page.getByRole('heading', { name: 'Administration' }).waitFor()

    const requiredTabs = ['Overview', 'Enquiries', 'Users & roles', 'Analytics', 'Audit log', 'Settings']
    for (const tab of requiredTabs) assert(await page.getByRole('button', { name: tab }).isVisible(), `missing dashboard tab: ${tab}`)

    await page.getByRole('button', { name: 'Enquiries' }).click()
    await page.getByText('Alice Buyer').waitFor()

    await page.getByLabel('Update status for Alice Buyer').selectOption('under_review')
    await page.getByText('Enquiry status updated.').waitFor()
    assert(quotes[0].status === 'under_review', 'status mutation did not reach admin-quotes')

    await page.getByLabel('Assign enquiry from Alice Buyer').selectOption(salesUserId)
    await page.getByText('Enquiry assigned successfully.').waitFor()
    assert(quotes[0].assigned_to === salesUserId, 'assignment mutation did not reach admin-quotes')

    await page.getByRole('button', { name: 'Users & roles' }).click()
    await page.getByRole('heading', { name: 'Create user' }).waitFor()
    await page.getByText('Sales Officer').first().waitFor()

    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('heading', { name: 'Top pages' }).waitFor()
    await page.getByText('/products').waitFor()

    await page.getByRole('button', { name: 'Audit log' }).click()
    await page.getByRole('heading', { name: 'Audit history' }).waitFor()
    await page.getByText('user updated').first().waitFor()

    await page.getByRole('button', { name: 'Settings' }).click()
    const recipientInput = page.getByLabel('Notification email')
    await recipientInput.waitFor()
    assert(await recipientInput.inputValue() === 'sulaiman_shuaib@yahoo.com', 'notification recipient did not load')
    await recipientInput.fill('contact@example.com')
    await page.getByRole('button', { name: 'Save notification email' }).click()
    await page.getByText('Contact-form notification email updated successfully.').waitFor()
    assert(notificationEmail === 'contact@example.com', 'notification recipient update did not reach admin-users')

    if (viewport.width <= 430) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert(overflow <= 2, `dashboard horizontal page overflow: ${overflow}px`)
    }

    if (errors.length) throw new Error(errors.join(' | '))
    console.log(`PASS admin dashboard interactions ${viewport.width}x${viewport.height}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL admin dashboard interactions ${viewport.width}x${viewport.height}: ${error.message}`)
  } finally {
    await context.close()
  }
}

await runDashboardTest({ width: 1440, height: 900 })
await runDashboardTest({ width: 390, height: 844 })

await browser.close()
if (failures) process.exit(1)
