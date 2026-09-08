import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173'
const supabaseOrigin = 'https://test.supabase.co'
const quoteId = '33333333-3333-4333-8333-333333333333'

const roleCases = {
  super_admin: {
    tabs: ['Overview', 'Enquiries', 'Products', 'Testimonials', 'Users & roles', 'Analytics', 'Audit', 'Settings'],
    hidden: [],
    status: true,
    assign: true,
    reply: true,
    createUser: true,
  },
  admin: {
    tabs: ['Overview', 'Enquiries', 'Users & roles', 'Analytics', 'Audit'],
    hidden: ['Products', 'Testimonials', 'Settings'],
    status: true,
    assign: true,
    reply: true,
    createUser: true,
  },
  quote_manager: {
    tabs: ['Overview', 'Enquiries', 'Users & roles'],
    hidden: ['Products', 'Testimonials', 'Analytics', 'Audit', 'Settings'],
    status: true,
    assign: true,
    reply: true,
    createUser: false,
  },
  sales_officer: {
    tabs: ['Overview', 'Enquiries'],
    hidden: ['Products', 'Testimonials', 'Users & roles', 'Analytics', 'Audit', 'Settings'],
    status: true,
    assign: false,
    reply: true,
    createUser: false,
  },
  analytics_viewer: {
    tabs: ['Overview', 'Enquiries', 'Analytics'],
    hidden: ['Products', 'Testimonials', 'Users & roles', 'Audit', 'Settings'],
    status: false,
    assign: false,
    reply: false,
    createUser: false,
  },
  auditor: {
    tabs: ['Overview', 'Enquiries', 'Users & roles', 'Analytics', 'Audit'],
    hidden: ['Products', 'Testimonials', 'Settings'],
    status: false,
    assign: false,
    reply: false,
    createUser: false,
  },
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
const assert = (condition, message) => { if (!condition) throw new Error(message) }

function buildState(role, index) {
  const userId = `11111111-1111-4111-8${String(index).padStart(3, '0')}-111111111111`
  const email = `${role.replaceAll('_', '-')}-role@example.test`
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`
  const profile = { id: userId, full_name: `CI ${role}`, email, role, is_active: true, must_change_password: false, last_login_at: null, created_at: new Date().toISOString() }
  const authUser = { id: userId, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), user_metadata: { full_name: profile.full_name }, app_metadata: { provider: 'email', providers: ['email'] }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  const quote = { id: quoteId, full_name: 'Role Test Buyer', company_name: 'Role Test Imports', email: 'buyer@example.test', phone: '+2348000000000', product_name: 'S&S Ginger', destination_country: 'Ghana', message: 'Role permission test enquiry.', status: 'new', assigned_to: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  return { role, userId, email, accessToken, profile, authUser, quote }
}

async function installMocks(page, state) {
  await page.route(`${supabaseOrigin}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' })
    if (path === '/auth/v1/token') return json(route, { access_token: state.accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: `refresh-${state.role}`, user: state.authUser })
    if (path === '/auth/v1/user') return json(route, state.authUser)
    if (path === '/rest/v1/profiles') {
      if (url.searchParams.has('id')) return json(route, state.profile)
      return json(route, [state.profile])
    }
    if (path === '/rest/v1/quotes') return json(route, [state.quote])
    if (path === '/rest/v1/visits') return json(route, [{ id: crypto.randomUUID(), page_path: '/', referrer: null, user_agent: 'Playwright', created_at: new Date().toISOString() }])
    if (path === '/rest/v1/audit_logs') return json(route, [{ id: 1, actor_id: state.userId, action: 'role_test', entity_type: 'profile', entity_id: state.userId, details: { role: state.role }, created_at: new Date().toISOString() }])
    if (path === '/rest/v1/quote_responses') return json(route, [])
    if (path === '/functions/v1/admin-users') {
      const body = request.postDataJSON() || {}
      if (body.action === 'record-login') return json(route, { success: true })
      if (state.role === 'super_admin' && body.action === 'get-settings') return json(route, { settings: { quoteNotificationEmail: 'contact@example.test', updatedAt: new Date().toISOString() } })
      return json(route, { success: true })
    }
    if (path === '/functions/v1/admin-content') {
      if (state.role !== 'super_admin') return json(route, { error: 'Only a super administrator can manage public content.' }, 403)
      return json(route, { products: [], testimonials: [], testimonialCandidates: [state.quote] })
    }
    if (path === '/functions/v1/admin-quotes') {
      const body = request.postDataJSON() || {}
      if (body.action === 'update-status' && !['super_admin', 'admin', 'quote_manager', 'sales_officer'].includes(state.role)) return json(route, { error: 'You cannot update enquiry status.' }, 403)
      if (body.action === 'assign' && !['super_admin', 'admin', 'quote_manager'].includes(state.role)) return json(route, { error: 'You cannot assign enquiries.' }, 403)
      return json(route, { success: true, quote: { id: quoteId, status: body.status || state.quote.status, assigned_to: body.assignedTo || null, updated_at: new Date().toISOString() } })
    }
    if (path === '/functions/v1/reply-to-quote') {
      if (!['super_admin', 'admin', 'quote_manager', 'sales_officer'].includes(state.role)) return json(route, { error: 'Your role cannot send customer replies.' }, 403)
      return json(route, { success: true, response: { id: crypto.randomUUID(), quote_id: quoteId, staff_id: state.userId, recipient_email: state.quote.email, subject: 'Reply', body: 'Test', created_at: new Date().toISOString() }, status: 'contacted' })
    }
    return json(route, [])
  })
}

const browser = await chromium.launch({ headless: true })
let failures = 0
let index = 1

for (const [role, expected] of Object.entries(roleCases)) {
  const state = buildState(role, index++)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  try {
    await installMocks(page, state)
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' })
    await page.getByLabel('Email address').fill(state.email)
    await page.getByLabel('Password').fill('ci-role-test-value')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')
    await page.getByRole('heading', { name: 'Trade Operations' }).waitFor()

    for (const tab of expected.tabs) assert(await page.getByRole('button', { name: tab, exact: true }).isVisible(), `${role}: expected ${tab} tab`)
    for (const tab of expected.hidden) assert(await page.getByRole('button', { name: tab, exact: true }).count() === 0, `${role}: ${tab} should be hidden`)

    await page.getByRole('button', { name: 'Enquiries', exact: true }).click()
    const card = page.locator('.ops-enquiry-card').first()
    await card.getByText('Role Test Buyer').waitFor()
    assert((await card.getByLabel('Status').count() > 0) === expected.status, `${role}: status permission mismatch`)
    assert((await card.getByLabel('Assigned to').count() > 0) === expected.assign, `${role}: assignment permission mismatch`)
    const openLabel = expected.reply ? 'Open & reply' : 'Open enquiry'
    assert(await card.getByRole('button', { name: openLabel }).isVisible(), `${role}: enquiry open action mismatch`)

    if (expected.tabs.includes('Users & roles')) {
      await page.getByRole('button', { name: 'Users & roles' }).click()
      assert((await page.locator('.ops-create-user').count() > 0) === expected.createUser, `${role}: create-user permission mismatch`)
      if (!expected.createUser) assert(await page.getByText(state.email).isVisible(), `${role}: should retain read-only directory access`)
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    assert(overflow <= 2, `${role}: mobile horizontal overflow ${overflow}px`)
    console.log(`PASS role permissions ${role}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL role permissions ${role}: ${error.message}`)
  } finally {
    await context.close()
  }
}

await browser.close()
if (failures) process.exit(1)
