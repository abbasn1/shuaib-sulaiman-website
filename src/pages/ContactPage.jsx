import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { products } from '../data'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function ContactPage() {
  const location = useLocation()
  const selectedProduct = location.state?.product ?? ''
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')

    if (!supabase) {
      setStatus('The enquiry service is not configured yet. Please email info@shuaibsulaiman.com.')
      return
    }

    const form = new FormData(event.currentTarget)
    setSubmitting(true)

    const { error } = await supabase.from('quotes').insert({
      full_name: form.get('full_name'),
      company_name: form.get('company_name') || null,
      email: form.get('email'),
      phone: form.get('phone') || null,
      product_name: form.get('product_name') || null,
      destination_country: form.get('destination_country') || null,
      message: form.get('message'),
      status: 'new',
    })

    setSubmitting(false)

    if (error) {
      setStatus(`Unable to send your enquiry: ${error.message}`)
      return
    }

    event.currentTarget.reset()
    setStatus('Thank you. Your enquiry has been received and our team will contact you.')
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
            <input name="full_name" type="text" placeholder="Your name" required />
          </label>
          <label>
            Company Name
            <input name="company_name" type="text" placeholder="Your company" />
          </label>
          <label>
            Email Address
            <input name="email" type="email" placeholder="name@company.com" required />
          </label>
          <label>
            Phone Number
            <input name="phone" type="tel" placeholder="Your phone number" />
          </label>
          <label>
            Product of Interest
            <select name="product_name" defaultValue={selectedProduct}>
              <option value="">Select a product</option>
              {products.map((product) => <option key={product.slug} value={product.name}>{product.name}</option>)}
            </select>
          </label>
          <label>
            Destination Country
            <input name="destination_country" type="text" placeholder="Destination country" />
          </label>
          <label>
            Message
            <textarea name="message" rows="6" placeholder="Product, quantity, packaging and other requirements" required />
          </label>
          {status && <p className="form-status" role="status">{status}</p>}
          {!isSupabaseConfigured && <p className="form-status">Online enquiry storage is not configured.</p>}
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Enquiry'}</button>
        </form>
      </section>
    </>
  )
}

export default ContactPage
