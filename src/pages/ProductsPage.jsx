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
        eyebrow="S&S Export Catalogue"
        title="Seven carefully selected products for global markets."
        text="Explore S&S Shea Butter, S&S Garri, S&S Cashew Nut, S&S Ginger, S&S Charcoal, S&S Coal (Black) and S&S Yam Flour (Amala). Select a product to view its uses, packaging options and export information."
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
