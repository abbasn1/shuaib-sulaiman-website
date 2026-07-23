import { useLocation } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { products } from '../data'

function ContactPage() {
  const location = useLocation()
  const selectedProduct = location.state?.product ?? ''

  const handleSubmit = (event) => {
    event.preventDefault()
    window.alert('Thank you. The form is currently a demonstration and will be connected to email or a database later.')
  }

  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="Tell us what you would like to source."
        text="Share your product, quantity, packaging and destination requirements. Our team will respond with the appropriate next steps."
      />

      <section className="contact section contact-page">
        <div className="contact-information">
          <p className="section-label">Start Trading</p>
          <h2>Let&apos;s discuss your requirement.</h2>
          <p>Please provide as much information as possible so the team can review availability and prepare an appropriate response.</p>

          <div className="contact-cards">
            <article><span>Email</span><a href="mailto:info@shuaibsulaiman.com">info@shuaibsulaiman.com</a></article>
            <article><span>Location</span><strong>Lagos, Nigeria</strong></article>
            <article><span>Minimum Order</span><strong>1 × 20ft Container</strong></article>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input type="text" placeholder="Your name" required />
          </label>
          <label>
            Company Name
            <input type="text" placeholder="Your company" />
          </label>
          <label>
            Email Address
            <input type="email" placeholder="name@company.com" required />
          </label>
          <label>
            Phone Number
            <input type="tel" placeholder="Your phone number" />
          </label>
          <label>
            Product of Interest
            <select defaultValue={selectedProduct}>
              <option value="">Select a product</option>
              {products.map((product) => <option key={product.slug} value={product.name}>{product.name}</option>)}
            </select>
          </label>
          <label>
            Destination Country
            <input type="text" placeholder="Destination country" />
          </label>
          <label>
            Message
            <textarea rows="6" placeholder="Product, quantity, packaging and other requirements" required />
          </label>
          <button className="primary-button" type="submit">Send Enquiry</button>
        </form>
      </section>
    </>
  )
}

export default ContactPage
