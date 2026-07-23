import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { products } from '../data'

const socialLinks = [
  {
    name: 'Facebook',
    href: import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/',
    icon: (
      <path d="M14 8.5h3V5h-3c-3.3 0-5 2-5 5v2H6v3.5h3V24h4v-8.5h3.2l.8-3.5h-4v-1.7c0-1.2.4-1.8 1-1.8Z" />
    ),
  },
  {
    name: 'Instagram',
    href: import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/',
    icon: (
      <>
        <rect x="3.5" y="3.5" width="21" height="21" rx="6" />
        <circle cx="14" cy="14" r="5" />
        <circle cx="20.5" cy="7.8" r="1.2" className="social-icon-fill" />
      </>
    ),
  },
  {
    name: 'LinkedIn',
    href: import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/',
    icon: (
      <>
        <rect x="5" y="10.5" width="4" height="12" />
        <circle cx="7" cy="6.5" r="2" className="social-icon-fill" />
        <path d="M13 22.5v-12h4v1.7c1-1.4 2.3-2.2 4.2-2.2 3.6 0 4.8 2.3 4.8 6v6.5h-4V17c0-2.2-.6-3.5-2.4-3.5-2 0-2.6 1.5-2.6 3.8v5.2h-4Z" />
      </>
    ),
  },
  {
    name: 'X',
    href: import.meta.env.VITE_X_URL || 'https://x.com/',
    icon: <path d="M5 4h5.2l4.5 6.1L20 4h3l-6.9 8 7.4 10H18l-4.9-6.7L7.3 22H4l7.6-8.8L5 4Zm4 2 10 14h1.5L10.5 6H9Z" />,
  },
]

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
          <div className="social-links" aria-label="Social media links">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Follow Shuaib Sulaiman & Co on ${social.name}`}
                title={social.name}
              >
                <svg viewBox="0 0 28 28" aria-hidden="true">
                  {social.icon}
                </svg>
              </a>
            ))}
          </div>
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
