import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_SITE_ORIGIN,
  getOrganizationSchema,
  getProductSchema,
  getSeoForPath,
  normalizeOrigin,
  sitemapRoutes,
} from '../src/seo.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2] || 'all'
const siteOrigin = normalizeOrigin(process.env.SITE_URL || process.env.VITE_SITE_URL || DEFAULT_SITE_ORIGIN)

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const escapeXml = escapeHtml

const jsonLd = (schema) => JSON.stringify(schema).replaceAll('<', '\\u003c')

const buildHead = (pathname) => {
  const seo = getSeoForPath(pathname, siteOrigin)
  const schemas = [
    getOrganizationSchema(siteOrigin),
    getProductSchema(seo.product, siteOrigin),
  ].filter(Boolean)

  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(seo.type)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(seo.imageUrl)}" />`,
    '<meta property="og:site_name" content="Shuaib Sulaiman &amp; Co" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.imageUrl)}" />`,
    ...schemas.map((schema, index) => `<script type="application/ld+json" data-site-structured-data="${index}">${jsonLd(schema)}</script>`),
  ].join('\n    ')
}

const buildSnapshot = (pathname) => {
  const seo = getSeoForPath(pathname, siteOrigin)
  if (pathname.startsWith('/admin')) return '<div id="root"></div>'

  if (seo.product) {
    return `<div id="root"><main data-prerendered="true"><article><p>${escapeHtml(seo.product.category)}</p><h1>${escapeHtml(seo.product.name)}</h1><p>${escapeHtml(seo.product.summary)}</p><p>${escapeHtml(seo.product.overview)}</p><a href="/contact">Request a quote</a></article></main></div>`
  }

  return `<div id="root"><main data-prerendered="true"><article><h1>${escapeHtml(seo.title.replace(` | Shuaib Sulaiman & Co`, ''))}</h1><p>${escapeHtml(seo.description)}</p></article></main></div>`
}

const stripBaseSeo = (html) => html
  .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
  .replace(/\s*<meta\s+name=["']description["'][^>]*>/i, '')
  .replace(/\s*<meta\s+name=["']robots["'][^>]*>/i, '')
  .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/i, '')

const renderHtml = (template, pathname) => {
  const withoutBaseSeo = stripBaseSeo(template)
  return withoutBaseSeo
    .replace('</head>', `    ${buildHead(pathname)}\n  </head>`)
    .replace('<div id="root"></div>', buildSnapshot(pathname))
}

async function writePublicSeo() {
  const publicDir = join(rootDir, 'public')
  await mkdir(publicDir, { recursive: true })

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapRoutes.map((route) => `  <url><loc>${escapeXml(`${siteOrigin}${route}`)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n')

  await writeFile(join(publicDir, 'sitemap.xml'), sitemap)
  await writeFile(join(publicDir, 'robots.txt'), robots)
}

async function writePrerenderedHtml() {
  const distDir = join(rootDir, 'dist')
  const template = await readFile(join(distDir, 'index.html'), 'utf8')
  const routes = [
    ...sitemapRoutes,
    '/admin',
    '/admin/change-password',
    '/admin/dashboard',
  ]

  for (const route of routes) {
    if (route === '/') {
      await writeFile(join(distDir, 'index.html'), renderHtml(template, route))
      continue
    }
    const output = join(distDir, route.slice(1), 'index.html')
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, renderHtml(template, route))
  }
}

if (mode === 'public' || mode === 'all') await writePublicSeo()
if (mode === 'dist' || mode === 'all') await writePrerenderedHtml()

console.log(`SEO assets generated for ${siteOrigin} (${mode}).`)
