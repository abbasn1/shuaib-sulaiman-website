import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getOrganizationSchema, getProductSchema, getSeoForPath } from '../seo'

const META_KEYS = [
  ['name', 'description'],
  ['name', 'robots'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:type'],
  ['property', 'og:url'],
  ['property', 'og:image'],
  ['property', 'og:site_name'],
  ['name', 'twitter:card'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
]

const ensureMeta = (attribute, key, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

const ensureCanonical = (href) => {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

const replaceStructuredData = (schemas) => {
  document.head.querySelectorAll('script[data-site-structured-data]').forEach((element) => element.remove())
  schemas.filter(Boolean).forEach((schema, index) => {
    const element = document.createElement('script')
    element.type = 'application/ld+json'
    element.dataset.siteStructuredData = String(index)
    element.textContent = JSON.stringify(schema)
    document.head.appendChild(element)
  })
}

function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const origin = window.location.origin
    const seo = getSeoForPath(pathname, origin)

    document.title = seo.title
    ensureMeta('name', 'description', seo.description)
    ensureMeta('name', 'robots', seo.robots)
    ensureMeta('property', 'og:title', seo.title)
    ensureMeta('property', 'og:description', seo.description)
    ensureMeta('property', 'og:type', seo.type)
    ensureMeta('property', 'og:url', seo.canonicalUrl)
    ensureMeta('property', 'og:image', seo.imageUrl)
    ensureMeta('property', 'og:site_name', 'Shuaib Sulaiman & Co')
    ensureMeta('name', 'twitter:card', 'summary_large_image')
    ensureMeta('name', 'twitter:title', seo.title)
    ensureMeta('name', 'twitter:description', seo.description)
    ensureMeta('name', 'twitter:image', seo.imageUrl)
    ensureCanonical(seo.canonicalUrl)

    replaceStructuredData([
      getOrganizationSchema(origin),
      getProductSchema(seo.product, origin),
    ])

    return () => {
      META_KEYS.forEach(([attribute, key]) => {
        const element = document.head.querySelector(`meta[${attribute}="${key}"]`)
        if (element?.dataset?.temporarySeo === 'true') element.remove()
      })
    }
  }, [pathname])

  return null
}

export default SeoManager
