import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { products, services, testimonials } from '../data'

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">Based in Lagos, Nigeria · Trading Globally</p>
          <h1>
            Nigeria&apos;s trusted
            <span>trade and export partner</span>
          </h1>
          <p className="hero-copy">
            We source, inspect and coordinate the delivery of selected Nigerian products for buyers across international markets.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/contact">Request a Quote</Link>
            <Link className="text-button" to="/about">Who We Are <span>→</span></Link>
          </div>
        </div>

        <div className="hero-stats">
          <div><strong>15+</strong><span>Years Active</span></div>
          <div><strong>20+</strong><span>Export Products</span></div>
          <div><strong>3×</strong><span>Container Capacity</span></div>
          <div><strong>50+</strong><span>Global Clients</span></div>
          <div><strong>1 × 20ft</strong><span>Minimum Order</span></div>
        </div>
      </section>

      <section className="ticker" aria-label="Product categories">
        <div>
          {[...products.slice(0, 10), ...products.slice(0, 10)].map((product, index) => (
            <span key={`${product.name}-${index}`}>{product.name}</span>
          ))}
        </div>
      </section>

      <section className="story section">
        <div className="story-image-wrap">
          <img src="/images/story.jpg" alt="Temporary company story placeholder" />
          <div className="story-year"><strong>2010</strong><span>Established in Lagos</span></div>
        </div>

        <div className="story-copy">
          <p className="section-label">Our Story</p>
          <h2>Trade enablers, not just exporters.</h2>
          <p>
            Shuaib Sulaiman & Co connects Nigerian products with international buyers through dependable sourcing, quality assurance and export coordination.
          </p>
          <p>
            We support documentation, freight planning, packaging requirements and supply delivery for growing businesses and established organisations.
          </p>
          <div className="story-points">
            <div><strong>Sourcing</strong><span>Reliable product supply</span></div>
            <div><strong>Logistics</strong><span>Export shipping support</span></div>
            <div><strong>Delivery</strong><span>Coordinated cargo movement</span></div>
          </div>
          <Link className="inline-link" to="/about">Learn more about us →</Link>
        </div>
      </section>

      <section className="catalogue section">
        <div className="section-heading">
          <div>
            <p className="section-label">Export Catalogue</p>
            <h2>Quality Nigerian products for global markets.</h2>
          </div>
          <Link className="outline-button" to="/products">View All Products</Link>
        </div>

        <div className="product-grid home-products">
          {products.slice(0, 12).map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="metrics">
        <div><strong>20+</strong><span>Export Products</span><p>A broad product range for different market needs.</p></div>
        <div><strong>50+</strong><span>Global Buyers</span><p>International buyers supported across multiple regions.</p></div>
        <div><strong>15+</strong><span>Years Experience</span><p>Practical experience in sourcing and export coordination.</p></div>
        <div><strong>100%</strong><span>Quality Focus</span><p>Careful handling of standards, documentation and delivery.</p></div>
      </section>

      <section className="services section">
        <div className="section-heading light">
          <div>
            <p className="section-label">What We Offer</p>
            <h2>Three pillars of our export ecosystem.</h2>
          </div>
          <Link className="outline-button light-outline" to="/services">View Services</Link>
        </div>

        <div className="service-grid">
          {services.map((service) => (
            <article key={service.number}>
              <span>{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="testimonials section">
        <div className="section-heading">
          <div>
            <p className="section-label">Client Reviews</p>
            <h2>Trusted by buyers across different markets.</h2>
          </div>
        </div>

        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <blockquote key={testimonial.name}>
              <span className="quote-mark">“</span>
              <p>{testimonial.quote}</p>
              <footer><strong>{testimonial.name}</strong><span>{testimonial.role}</span></footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="home-cta section">
        <div>
          <p className="section-label">Start Trading</p>
          <h2>Ready to source from Nigeria?</h2>
          <p>Share your product, quantity, packaging and destination requirements with our team.</p>
        </div>
        <Link className="primary-button" to="/contact">Send an Enquiry</Link>
      </section>
    </>
  )
}

export default HomePage
