import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { products } from '../data'

const exportSteps = [
  ['01', 'Requirement Review', 'We confirm product type, quantity, destination, packaging and quality expectations.'],
  ['02', 'Sourcing & Verification', 'The product is matched with suitable suppliers and checked against the agreed specification.'],
  ['03', 'Packing & Documentation', 'Packaging, labels and export documents are prepared for the destination market.'],
  ['04', 'Shipment Coordination', 'Loading and freight arrangements are coordinated through the agreed delivery point.'],
]

function ProductDetailsPage() {
  const { slug } = useParams()
  const product = products.find((item) => item.slug === slug)

  useEffect(() => {
    document.title = product
      ? `${product.name} | Shuaib Sulaiman & Co`
      : 'Product Not Found | Shuaib Sulaiman & Co'
  }, [product])

  if (!product) {
    return (
      <section className="not-found section">
        <p className="section-label">Product Not Found</p>
        <h1>The requested product is unavailable.</h1>
        <Link className="primary-button" to="/products">Back to Products</Link>
      </section>
    )
  }

  const relatedProducts = products
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 3)

  const currentIndex = products.findIndex((item) => item.slug === product.slug)
  const previousProduct = products[(currentIndex - 1 + products.length) % products.length]
  const nextProduct = products[(currentIndex + 1) % products.length]

  return (
    <>
      <section className="product-detail-hero">
        <div className="product-detail-hero-inner">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            <Link to="/products">Products</Link><span>/</span>
            <span>{product.name}</span>
          </nav>

          <div className="product-detail-layout">
            <div className="product-detail-image">
              <img src={product.image} alt={product.name} />
              <span className="image-category">{product.category}</span>
            </div>

            <div className="product-detail-copy">
              <p className="section-label">Export Product</p>
              <h1>{product.name}</h1>
              <p className="product-lead">{product.summary}</p>
              <p>{product.overview}</p>

              <div className="quick-facts">
                <div><span>Minimum Order</span><strong>1 × 20ft Container</strong></div>
                <div><span>Supply Location</span><strong>Nigeria</strong></div>
                <div><span>Pricing</span><strong>Request a Quote</strong></div>
              </div>

              <div className="detail-actions">
                <Link className="primary-button" to="/contact" state={{ product: product.name }}>Request a Quote</Link>
                <Link className="outline-button" to="/products">Back to Catalogue</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-content section">
        <div className="product-main-column">
          <div className="content-block">
            <p className="section-label">Product Value</p>
            <h2>Why buyers choose {product.name}.</h2>
            <div className="benefit-grid">
              {product.benefits.map((benefit, index) => (
                <article key={benefit}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{benefit}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="content-block applications-block">
            <p className="section-label">Common Uses</p>
            <h2>Suitable applications and buyer segments.</h2>
            <ul className="application-list">
              {product.applications.map((application) => <li key={application}>{application}</li>)}
            </ul>
          </div>

          <div className="content-block">
            <p className="section-label">Quality Approach</p>
            <h2>Prepared with export delivery in mind.</h2>
            <div className="quality-grid">
              {product.qualityPoints.map((point) => (
                <div key={point}><span>✓</span><p>{point}</p></div>
              ))}
            </div>
          </div>
        </div>

        <aside className="product-sidebar">
          <div className="specification-card">
            <p className="section-label">Product Information</p>
            <h3>Typical specification</h3>
            <dl>
              {Object.entries(product.specifications).map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </div>

          <div className="packaging-card">
            <p className="section-label">Packaging</p>
            <h3>Available approaches</h3>
            <ul>{product.packaging.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>

          <div className="sidebar-enquiry">
            <h3>Need this product?</h3>
            <p>Send the quantity, destination and preferred packaging to receive a tailored quotation.</p>
            <Link to="/contact" state={{ product: product.name }}>Enquire Now →</Link>
          </div>
        </aside>
      </section>

      <section className="export-process section">
        <div className="section-heading light">
          <div>
            <p className="section-label">How We Work</p>
            <h2>From product enquiry to coordinated shipment.</h2>
          </div>
        </div>
        <div className="process-grid">
          {exportSteps.map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <nav className="product-next-navigation section" aria-label="Product navigation">
        <Link to={`/export-product/${previousProduct.slug}`} className="previous-product">
          <span>← Previous Product</span>
          <strong>{previousProduct.name}</strong>
        </Link>
        <Link to={`/export-product/${nextProduct.slug}`} className="next-product">
          <span>Next Product →</span>
          <strong>{nextProduct.name}</strong>
        </Link>
      </nav>

      {relatedProducts.length > 0 && (
        <section className="related-products section">
          <div className="section-heading">
            <div>
              <p className="section-label">Related Products</p>
              <h2>More from the {product.category.toLowerCase()} category.</h2>
            </div>
            <Link className="outline-button" to="/products">View All Products</Link>
          </div>
          <div className="related-grid">
            {relatedProducts.map((item) => (
              <Link key={item.slug} to={`/export-product/${item.slug}`} className="related-card">
                <img src={item.image} alt={item.name} />
                <div><span>{item.category}</span><h3>{item.name}</h3></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="product-cta section">
        <div><p className="section-label">Start an Order</p><h2>Request pricing for {product.name}.</h2></div>
        <Link className="primary-button" to="/contact" state={{ product: product.name }}>Get a Product Quote</Link>
      </section>
    </>
  )
}

export default ProductDetailsPage
