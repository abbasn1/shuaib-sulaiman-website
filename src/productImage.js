const brandedProductImages = {
  's-s-shea-butter': '/images/products/ss-shea-butter.webp',
  's-s-garri-cassava': '/images/products/ss-garri-white-ijebu.webp',
  's-s-cashew-nut': '/images/products/ss-cashew-nut.webp',
}

export function getProductImage(product) {
  return brandedProductImages[product.slug] ?? product.image
}
