import { products } from './data.js'

export const SITE_NAME = 'Shuaib Sulaiman & Co'
export const DEFAULT_SITE_ORIGIN = 'https://shuaibsulaimangeneralcontractors.com'
export const DEFAULT_OG_IMAGE = '/images/logo.png'

export const PUBLIC_STATIC_ROUTES = [
  '/',
  '/about',
  '/products',
  '/services',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
]

const PAGE_META = {
  '/': {
    title: 'Shuaib Sulaiman & Co | Nigerian Trade, Export & Sourcing',
    description: 'Trusted Nigerian sourcing, export coordination and trade consulting for international buyers seeking dependable products and shipment support.',
  },
  '/about': {
    title: 'About Shuaib Sulaiman & Co | Trade & Export Partner',
    description: 'Learn how Shuaib Sulaiman & Co supports buyers with Nigerian sourcing, supplier coordination, quality checks, documentation and export logistics.',
  },
  '/products': {
    title: 'Nigerian Export Products | Shuaib Sulaiman & Co',
    description: 'Explore Nigerian shea butter, garri, cashew, ginger, charcoal, coal and yam flour supplied for qualified wholesale and international buyers.',
  },
  '/services': {
    title: 'Sourcing, Export & Trade Services | Shuaib Sulaiman & Co',
    description: 'International sourcing, supplier coordination, product inspection, documentation and export logistics support from Nigeria.',
  },
  '/contact': {
    title: 'Request a Quote | Shuaib Sulaiman & Co',
    description: 'Send a product or trade enquiry to Shuaib Sulaiman & Co for sourcing, export, logistics and consulting support from Nigeria.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Shuaib Sulaiman & Co',
    description: 'Read how Shuaib Sulaiman & Co handles information submitted through its trade, export and sourcing website.',
  },
  '/terms-and-conditions': {
    title: 'Terms & Conditions | Shuaib Sulaiman & Co',
    description: 'Review the website and enquiry terms that apply when using Shuaib Sulaiman & Co online trade and export services.',
  },
}

const stripTrailingSlash = (value) => value.length > 1 ? value.replace(/\/+$/, '') : value
const normalizePathname = (pathname = '/') => stripTrailingSlash(pathname || '/')

export const normalizeOrigin = (origin = DEFAULT_SITE_ORIGIN) => stripTrailingSlash(origin || DEFAULT_SITE_ORIGIN)

export const canonicalPathFor = (pathname) => {
  const normalizedPath = normalizePathname(pathname)
  if (normalizedPath === '/terms') return '/terms-and-conditions'
  const aliasMatch = normalizedPath.match(/^\/products\/([^/]+)$/)
  if (aliasMatch) return `/export-product/${aliasMatch[1]}`
  return normalizedPath
}

export const findProductForPath = (pathname) => {
  const normalizedPath = normalizePathname(pathname)
  const match = normalizedPath.match(/^\/(?:export-product|products)\/([^/]+)$/)
  if (!match) return null
  return products.find((product) => product.slug === match[1]) || null
}

export function getSeoForPath(pathname, origin = DEFAULT_SITE_ORIGIN) {
  const siteOrigin = normalizeOrigin(origin)
  const normalizedPath = normalizePathname(pathname)
  const product = findProductForPath(normalizedPath)
  const canonicalPath = canonicalPathFor(normalizedPath)
  const canonicalUrl = `${siteOrigin}${canonicalPath}`

  if (normalizedPath.startsWith('/admin')) {
    return {
      title: `Administration | ${SITE_NAME}`,
      description: 'Private administration area for Shuaib Sulaiman & Co staff.',
      canonicalUrl,
      canonicalPath,
      imageUrl: `${siteOrigin}${DEFAULT_OG_IMAGE}`,
      robots: 'noindex, nofollow, noarchive',
      type: 'website',
      product: null,
    }
  }

  if (product) {
    return {
      title: `${product.name} Export Supply | ${SITE_NAME}`,
      description: `${product.summary} Category: ${product.category}. Request a specification-led export quotation from Nigeria.`,
      canonicalUrl,
      canonicalPath,
      imageUrl: `${siteOrigin}${product.image}`,
      robots: 'index, follow',
      type: 'website',
      product,
    }
  }

  const page = PAGE_META[canonicalPath] || {
    title: `Page not found | ${SITE_NAME}`,
    description: 'The requested page could not be found.',
  }

  return {
    ...page,
    canonicalUrl,
    canonicalPath,
    imageUrl: `${siteOrigin}${DEFAULT_OG_IMAGE}`,
    robots: PAGE_META[canonicalPath] ? 'index, follow' : 'noindex, follow',
    type: 'website',
    product: null,
  }
}

export function getOrganizationSchema(origin = DEFAULT_SITE_ORIGIN) {
  const siteOrigin = normalizeOrigin(origin)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteOrigin,
    logo: `${siteOrigin}/images/logo.png`,
    email: [
      'sulaiman_shuaib@yahoo.com',
      'shuaibsgeneralcontractors@gmail.com',
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '63 Pent City Estate, Lokogoma',
      addressLocality: 'Abuja',
      addressCountry: 'NG',
    },
    description: 'Nigerian trade, export, sourcing and consulting company supporting international buyers.',
  }
}

export function getProductSchema(product, origin = DEFAULT_SITE_ORIGIN) {
  if (!product) return null
  const siteOrigin = normalizeOrigin(origin)
  const pageUrl = `${siteOrigin}/export-product/${product.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    name: `${product.name} Export Supply`,
    url: pageUrl,
    description: product.summary,
    primaryImageOfPage: {
      '@type': 'ImageObject',
      contentUrl: `${siteOrigin}${product.image}`,
    },
    about: {
      '@type': 'Thing',
      name: product.name,
      description: product.summary,
      image: `${siteOrigin}${product.image}`,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: siteOrigin,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteOrigin,
      logo: {
        '@type': 'ImageObject',
        url: `${siteOrigin}/images/logo.png`,
      },
    },
  }
}

export const productCanonicalRoutes = products.map((product) => `/export-product/${product.slug}`)
export const sitemapRoutes = [...PUBLIC_STATIC_ROUTES, ...productCanonicalRoutes]
