import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')
const expectIncludes = (content, value, label) => assert.ok(content.includes(value), `${label} is missing: ${value}`)
const expectExcludes = (content, value, label) => assert.ok(!content.includes(value), `${label} unexpectedly contains: ${value}`)

const home = await read('dist/index.html')
expectIncludes(home, '<title>Shuaib Sulaiman &amp; Co | Nigerian Trade, Export &amp; Sourcing</title>', 'home title')
expectIncludes(home, 'data-prerendered="true"', 'home prerender snapshot')
expectIncludes(home, 'application/ld+json', 'home organization JSON-LD')

const about = await read('dist/about/index.html')
expectIncludes(about, '<link rel="canonical" href="https://shuaibsulaiman.com/about" />', 'about canonical')
expectIncludes(about, 'About Shuaib Sulaiman &amp; Co', 'about metadata')

const product = await read('dist/export-product/s-s-shea-butter/index.html')
expectIncludes(product, 'S&amp;S Shea Butter Export Supply', 'product title')
expectIncludes(product, 'https://shuaibsulaiman.com/export-product/s-s-shea-butter', 'product canonical')
expectIncludes(product, '"@type":"Product"', 'product JSON-LD')
expectIncludes(product, 'Natural Nigerian shea butter', 'product prerendered content')

const admin = await read('dist/admin/index.html')
expectIncludes(admin, 'noindex, nofollow, noarchive', 'admin robots metadata')
expectExcludes(admin, 'data-prerendered="true"', 'admin prerender content')

const robots = await read('dist/robots.txt')
expectIncludes(robots, 'Disallow: /admin', 'robots admin block')
expectIncludes(robots, 'Sitemap: https://shuaibsulaiman.com/sitemap.xml', 'robots sitemap location')

const sitemap = await read('dist/sitemap.xml')
expectIncludes(sitemap, 'https://shuaibsulaiman.com/export-product/s-s-shea-butter', 'sitemap product URL')
expectExcludes(sitemap, '/products/s-s-shea-butter', 'sitemap duplicate product alias')
expectExcludes(sitemap, '/admin', 'sitemap admin URL')

const redirects = await read('dist/_redirects')
expectIncludes(redirects, '/products/:slug /export-product/:slug 301', 'product alias redirect')
expectIncludes(redirects, '/terms /terms-and-conditions 301', 'terms alias redirect')

console.log('PASS SEO prerender, metadata, sitemap, robots and redirects')
