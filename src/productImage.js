const brandedProductImages = {
  's-s-shea-butter': '/images/products/ss-shea-butter.webp',
  's-s-garri-cassava': '/images/products/ss-cassava-flour.webp',
  's-s-cashew-nut': '/images/products/ss-cashew-nut.webp',
  's-s-charcoal': '/images/products/ss-charcoal.webp',
  's-s-coal-black': '/images/products/ss-coal-black.webp',
  's-s-yam-flour-amala': '/images/products/ss-yam-flour-amala.webp',
}

const brandedProductGalleries = {
  's-s-yam-flour-amala': [
    '/images/products/ss-yam-flour-amala.webp',
    '/images/products/ss-yam-flour-amala-bulk.webp',
  ],
}

export function getProductImage(product) {
  if (!product) return ''
  return brandedProductImages[product.slug] ?? product.image
}

export function getProductImages(product) {
  if (!product) return []

  const primaryImage = getProductImage(product)
  const gallery = brandedProductGalleries[product.slug] ?? []

  return [...new Set([primaryImage, ...gallery].filter(Boolean))]
}
