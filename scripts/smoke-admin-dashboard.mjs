import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173'
const supabaseOrigin = 'https://test.supabase.co'
const userId = '11111111-1111-4111-8111-111111111111'
const salesUserId = '22222222-2222-4222-8222-222222222222'
const quoteId = '33333333-3333-4333-8333-333333333333'
const productId = '55555555-5555-4555-8555-555555555555'
const testimonialId = '66666666-6666-4666-8666-666666666666'
const ciAdminEmail = 'ci-admin@example.test'

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`

const authUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: ciAdminEmail,
  email_confirmed_at: new Date().toISOString(),
  user_metadata: { full_name: 'CI Super Admin' },
  app_metadata: { provider: 'email', providers: ['email'] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const users = [
  {
    id: userId,
    full_name: 'CI Super Admin',
    email: ciAdminEmail,
    role: 'super_admin',
    is_active: true,
    must_change_password: false,
    last_login_at: new Date().toISOString(),
    created_at: '2026-09-08T21:04:52.000Z',
  },
  {
    id: salesUserId,
    full_name: 'CI Sales Officer',
    email: 'sales@example.test',
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
  email: 'alice@example.test',
  phone: '+2348000000000',
  product_name: 'S&S Ginger',
  destination_country: 'United Kingdom',
  message: 'Please quote one container and confirm packaging options.',
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

const products = [{
  id: productId,
  slug: 's-s-ginger',
  name: 'S&S Ginger',
  category: 'Agricultural',
  image_url: '/images/products/ginger.webp',
  summary: 'Nigerian ginger for export.',
  overview: 'Export-ready ginger.',
  benefits: ['Distinctive aroma'],
  applications: ['Spice production'],
  specifications: { Origin: 'Nigeria' },
  packaging: ['Lined bags'],
  quality_points: ['Batch selection'],
  is_published: true,
  sort_order: 40,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}]

const testimonials = [{
  id: testimonialId,
  source_quote_id: null,
  buyer_name: 'Published Buyer',
  company_name: 'Buyer Co',
  role_or_market: 'Importer, UK',
  quote_text: 'Clear communication and dependable coordination.',
  is_published: true,
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}]

const quoteResponses = []
let notificationEmail = 'sulaiman_shuaib@yahoo.com'

function resetFixtures() {
  quotes[0].status = 'new'
  quotes[0].assigned_to = null
  quotes[0].updated_at = new Date().toISOString()
  notificationEmail = 'sulaiman_shuaib@yahoo.com'
  quoteResponses.splice(0, quoteResponses.length)
}

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

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' })
    }

    if (path === '/auth/v1/token') {
      return json(route, { access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: 'ci-refresh-token', user: authUser })
    }
    if (path === '/auth/v1/user') return json(route, authUser)

    if (path === '/rest/v1/profiles') {
      if (url.searchParams.has('id')) return json(route, users[0])
      return json(route, users)
    }
    if (path === '/rest/v1/quotes') return json(route, quotes)
    if (path === '/rest/v1/visits') return json(route, visits)
    if (path === '/rest/v1/audit_logs') return json(route, auditLogs)
    if (path === '/rest/v1/quote_responses') return json(route, quoteResponses)

    if (path === '/functions/v1/admin-users') {
      const body = request.postDataJSON() || {}
      if (body.action === 'record-login') return json(route, { success: true, lastLoginAt: new Date().toISOString() })
      if (body.action === 'get-settings') return json(route, { settings: { quoteNotificationEmail: notificationEmail, updatedAt: new Date().toISOString() } })
      if (body.action === 'update-notification-email') {
        notificationEmail = body.email
        return json(route, { success: true, settings: { quoteNotificationEmail: notificationEmail, updatedAt: new Date().toISOString() } })
      }
      if (body.action === 'create') {
        users.push({
          id: '77777777-7777-4777-8777-777777777777',
          full_name: body.fullName,
          email: body.email,
          role: body.role,
          is_active: true,
          must_change_password: true,
          last_login_at: null,
          created_at: new Date().toISOString(),
        })
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

    if (path === '/functions/v1/reply-to-quote') {
      const body = request.postDataJSON() || {}
      const response = {
        id: '88888888-8888-4888-8888-888888888888',
        quote_id: quoteId,
        staff_id: userId,
        recipient_email: quotes[0].email,
        subject: body.subject,
        body: body.body,
        resend_email_id: 'ci-resend-id',
        created_at: new Date().toISOString(),
      }
      quoteResponses.push(response)
      if (quotes[0].status === 'new') quotes[0].status = 'contacted'
      return json(route, { success: true, response, status: quotes[0].status, emailId: 'ci-resend-id' })
    }

    if (path === '/functions/v1/admin-content') {
      const body = request.postDataJSON() || {}
      if (body.action === 'list') return json(route, { products, testimonials, testimonialCandidates: quotes })
      if (body.action === 'save-product') {
        const existing = body.id ? products.find((item) => item.id === body.id) : null
        const saved = {
          ...(existing || {}),
          id: existing?.id || '99999999-9999-4999-8999-999999999999',
          slug: body.slug,
          name: body.name,
          category: body.category,
          image_url: body.imageUrl,
          summary: body.summary,
          overview: body.overview,
          benefits: body.benefits,
          applications: body.applications,
          specifications: body.specifications,
          packaging: body.packaging,
          quality_points: body.qualityPoints,
          is_published: body.isPublished,
          sort_order: body.sortOrder,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        if (existing) Object.assign(existing, saved)
        else products.push(saved)
        return json(route, { success: true, product: saved })
      }
      if (body.action === 'set-product-published') {
        const item = products.find((entry) => entry.id === body.id)
        if (item) item.is_published = body.isPublished
        return json(route, { success: true, product: item })
      }
      if (body.action === 'create-testimonial-from-quote') {
        const candidate = quotes.find((entry) => entry.id === body.quoteId)
        const draft = {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          source_quote_id: candidate.id,
          buyer_name: candidate.full_name,
          company_name: candidate.company_name,
          role_or_market: candidate.destination_country,
          quote_text: candidate.message,
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        testimonials.push(draft)
        return json(route, { success: true, testimonial: draft })
      }
      if (body.action === 'set-testimonial-published') {
        const item = testimonials.find((entry) => entry.id === body.id)
        if (item) item.is_published = body.isPublished
        return json(route, { success: true, testimonial: item })
      }
      if (body.action === 'save-testimonial') return json(route, { success: true })
      return json(route, { success: true })
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
  resetFixtures()
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
    await page.getByLabel('Email address').fill(ciAdminEmail)
    await page.getByLabel('Password').fill('ci-test-value')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/admin/dashboard')
    await page.getByRole('heading', { name: 'Trade Operations' }).waitFor()

    const requiredTabs = ['Overview', 'Enquiries', 'Products', 'Testimonials', 'Users & roles', 'Analytics', 'Audit', 'Settings']
    for (const tab of requiredTabs) {
      assert(await page.getByRole('button', { name: tab, exact: true }).isVisible(), `missing dashboard tab: ${tab}`)
    }

    await page.getByRole('button', { name: 'Enquiries', exact: true }).click()
    const enquiryCard = page.locator('.ops-enquiry-card').first()
    await enquiryCard.getByText('Alice Buyer').waitFor()
    await enquiryCard.getByLabel('Status').selectOption('under_review')
    await page.getByText('Enquiry status saved.').waitFor()
    assert(quotes[0].status === 'under_review', 'status mutation did not reach admin-quotes')

    await enquiryCard.getByLabel('Assigned to').selectOption(salesUserId)
    await page.getByText('Enquiry assigned.').waitFor()
    assert(quotes[0].assigned_to === salesUserId, 'assignment mutation did not reach admin-quotes')

    await enquiryCard.getByRole('button', { name: 'Open & reply' }).click()
    await page.getByRole('heading', { name: 'Reply to Alice Buyer' }).waitFor()
    await page.getByLabel('Message').fill('Thank you. We can prepare the requested container quotation.')
    await page.getByRole('button', { name: 'Send reply' }).click()
    await page.getByText('Reply sent and added to the conversation history.').waitFor()
    assert(quoteResponses.length === 1, 'reply was not recorded by mocked reply service')

    await page.getByRole('button', { name: 'Products', exact: true }).click()
    await page.getByRole('button', { name: 'Add product' }).click()
    await page.getByLabel('Product name').fill('CI Test Product')
    await page.getByLabel('Slug').fill('ci-test-product')
    await page.getByLabel('Category').fill('Agricultural')
    await page.getByLabel('Summary').fill('CI managed product')
    await page.getByRole('button', { name: 'Save product' }).click()
    await page.getByText('Product added to the catalogue.').waitFor()
    assert(products.some((item) => item.slug === 'ci-test-product'), 'product creation did not reach admin-content')

    await page.getByRole('button', { name: 'Testimonials', exact: true }).click()
    await page.getByRole('button', { name: 'Create draft' }).first().click()
    await page.getByText('Draft created from the enquiry. Review the wording before publishing.').waitFor()
    assert(testimonials.some((item) => item.source_quote_id === quoteId), 'testimonial draft was not created')

    await page.getByRole('button', { name: 'Users & roles' }).click()
    await page.getByLabel('Full name').fill('CI New Staff')
    await page.getByLabel('Email').fill('new-staff@example.test')
    await page.getByLabel('Temporary password').fill('ci-temp-value-123')
    await page.getByRole('button', { name: 'Create user' }).click()
    await page.getByText('User created. They must change the temporary password on first sign-in.').waitFor()
    assert(users.some((user) => user.email === 'new-staff@example.test'), 'user creation did not reach admin-users')

    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('heading', { name: 'Top pages' }).waitFor()
    await page.getByText('/products').waitFor()

    await page.getByRole('button', { name: 'Audit' }).click()
    await page.getByRole('heading', { name: 'Audit trail' }).waitFor()
    await page.getByText('user updated').first().waitFor()

    await page.getByRole('button', { name: 'Settings' }).click()
    const recipientInput = page.getByLabel('Send new enquiry notifications to')
    await recipientInput.waitFor()
    assert(await recipientInput.inputValue() === 'sulaiman_shuaib@yahoo.com', 'notification recipient did not load')
    await recipientInput.fill('contact@example.test')
    await page.getByRole('button', { name: 'Save notification email' }).click()
    await page.getByText('Contact-form notification email updated.').waitFor()
    assert(notificationEmail === 'contact@example.test', 'notification recipient update did not reach admin-users')

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
