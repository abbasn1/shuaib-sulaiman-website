import { Link } from 'react-router-dom'

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
        <Link to={`/export-product/${product.slug}`}>View Details</Link>
      </div>
      <div className="product-meta">
        <h3><Link to={`/export-product/${product.slug}`}>{product.name}</Link></h3>
        <span>{product.category}</span>
      </div>
    </article>
  )
}

export default ProductCard
