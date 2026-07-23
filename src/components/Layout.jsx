import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { products } from '../data'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const navClassName = ({ isActive }) => (isActive ? 'active' : undefined)

  return (
    <div className="site-shell">
      <ScrollToTop />

      <header className="site-header">
        <Link className="brand" to="/" aria-label="Shuaib Sulaiman and Company home">
          <img src="/images/logo.png" alt="Shuaib Sulaiman and Company logo" />
          <span>
            <strong>Shuaib Sulaiman & Co</strong>
            <small>Trade · Export · Consulting</small>
          </span>
        </Link>

        <button
          className="menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={menuOpen ? 'navigation navigation-open' : 'navigation'} aria-label="Main navigation">
          <NavLink to="/" end className={navClassName}>Home</NavLink>
          <NavLink to="/about" className={navClassName}>About</NavLink>
          <NavLink to="/products" className={navClassName}>Products</NavLink>
          <NavLink to="/services" className={navClassName}>Services</NavLink>
          <NavLink to="/contact" className={navClassName}>Contact</NavLink>
        </nav>

        <Link className="quote-button" to="/contact">Get a Quote</Link>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-intro">
          <Link className="brand footer-brand" to="/">
            <img src="/images/logo.png" alt="" />
            <span>
              <strong>Shuaib Sulaiman & Co</strong>
              <small>Trade · Export · Consulting</small>
            </span>
          </Link>
          <p>Your gateway to trusted Nigerian sourcing and international trade support.</p>
        </div>

        <div>
          <h3>Navigate</h3>
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/products">Our Products</Link>
          <Link to="/services">Services</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div>
          <h3>Top Products</h3>
          {products.slice(0, 6).map((product) => (
            <Link key={product.slug} to={`/export-product/${product.slug}`}>{product.name}</Link>
          ))}
        </div>

        <div>
          <h3>Contact</h3>
          <p>Lagos, Nigeria</p>
          <a href="mailto:info@shuaibsulaiman.com">info@shuaibsulaiman.com</a>
          <p>MOQ: 1 × 20ft Container</p>
        </div>

        <div className="copyright">
          © {new Date().getFullYear()} Shuaib Sulaiman & Co. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

export default Layout
