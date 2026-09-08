import { useMemo, useState } from 'react'
import PageHero from '../components/PageHero'
import ProductCard from '../components/ProductCard'
import { usePublishedProducts } from '../lib/content'

function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState('All Products')
  const { products } = usePublishedProducts()

  const categories = useMemo(
    () => ['All Products', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  )

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'All Products') return products
    return products.filter((product) => product.category === activeCategory)
  }, [activeCategory, products])

  return (
    <>
      <PageHero
        eyebrow="S&S Export Catalogue"
        title={`${products.length} carefully selected products for global markets.`}
        text="Explore our current export catalogue. Select a product to review its uses, packaging options, specifications and export information."
      />

      <section className="catalogue section product-page-section">
        <div className="filters" role="group" aria-label="Filter products">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? 'filter active' : 'filter'}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        {visibleProducts.length === 0 && (
          <p className="empty-catalogue">No published products are available in this category right now.</p>
        )}

        <p className="order-note">Minimum order: 1 × 20ft container · Maximum: 3 × 20ft containers</p>
      </section>
    </>
  )
}

export default ProductsPage
