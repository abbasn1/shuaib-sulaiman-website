import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173'
const routes = [
  '/',
  '/about',
  '/products',
  '/export-product/s-s-shea-butter',
  '/products/s-s-shea-butter',
  '/services',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/terms',
  '/admin',
  '/admin/dashboard',
  '/definitely-not-a-real-page',
]

const publicRoutes = routes.filter((route) => !route.startsWith('/admin'))
const browser = await chromium.launch({ headless: true })
let failures = 0

async function checkRoute(route, viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const errors = []

  await page.route('https://test.supabase.co/**', async (mockRoute) => {
    const request = mockRoute.request()
    if (request.method() === 'OPTIONS') {
      return mockRoute.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: 'ok',
      })
    }

    if (new URL(request.url()).pathname === '/rest/v1/visits') {
      return mockRoute.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '[]',
      })
    }

    return mockRoute.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: '[]',
    })
  })

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('response', (response) => {
    const url = response.url()
    if (url.startsWith(baseUrl) && response.status() >= 400 && !url.includes('definitely-not-a-real-page')) {
      errors.push(`http ${response.status()}: ${url}`)
    }
  })

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
  const bodyText = (await page.locator('body').innerText()).trim()
  if (!response || response.status() >= 400) errors.push(`navigation status: ${response?.status() ?? 'none'}`)
  if (!bodyText) errors.push('empty body')

  if (viewport.width <= 430) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 2) errors.push(`horizontal overflow: ${overflow}px`)
  }

  if (errors.length) {
    failures += 1
    console.error(`FAIL ${route} ${viewport.width}x${viewport.height}: ${errors.join(' | ')}`)
  } else {
    console.log(`PASS ${route} ${viewport.width}x${viewport.height}`)
  }

  await context.close()
}

for (const route of routes) await checkRoute(route, { width: 1440, height: 900 })
for (const route of publicRoutes) await checkRoute(route, { width: 390, height: 844 })

await browser.close()
if (failures) process.exit(1)
