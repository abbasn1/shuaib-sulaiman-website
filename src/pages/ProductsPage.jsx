import { useMemo, useState } from 'react'
import PageHero from '../components/PageHero'
import ProductCard from '../components/ProductCard'
import { categories, products } from '../data'

function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState('All Products')

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'All Products') return products
    return products.filter((product) => product.category === activeCategory)
  }, [activeCategory])

  return (
    <>
      <PageHero
        eyebrow="Export Catalogue"
        title="Quality Nigerian products for global markets."
        text="Explore our full range of agricultural, processed food, wellness, lifestyle and industrial products. Select any product to view detailed information, common uses, packaging options and our export process."
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

        <p className="order-note">Minimum order: 1 × 20ft container · Maximum: 3 × 20ft containers</p>
      </section>
    </>
  )
}

export default ProductsPage
