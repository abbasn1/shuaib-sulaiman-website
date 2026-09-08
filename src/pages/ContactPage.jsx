import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageHero from '../components/PageHero'
import TurnstileWidget from '../components/TurnstileWidget'
import { usePublishedProducts } from '../lib/content'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

function ContactPage() {
  const location = useLocation()
  const selectedProduct = location.state?.product ?? ''
  const { products } = usePublishedProducts()
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [verificationKey, setVerificationKey] = useState(0)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')

    if (!supabase) {
      setStatus('The enquiry service is not configured yet. Please email shuaibsgeneralcontractors@gmail.com.')
      return
    }

    if (!turnstileSiteKey) {
      setStatus('Online enquiry submission is temporarily unavailable. Please email shuaibsgeneralcontractors@gmail.com.')
      return
    }

    if (!turnstileToken) {
      setStatus('Please complete the security verification before sending your enquiry.')
      return
    }

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const quoteId = crypto.randomUUID()

    setSubmitting(true)

    const { data, error: functionError } = await supabase.functions.invoke('send-quote-email', {
      body: {
        quote_id: quoteId,
        turnstile_token: turnstileToken,
        full_name: form.get('full_name'),
        company_name: form.get('company_name') || null,
        email: form.get('email'),
        phone: form.get('phone') || null,
        product_name: form.get('product_name') || null,
        destination_country: form.get('destination_country') || null,
        message: form.get('message'),
      },
    })

    setSubmitting(false)

    if (functionError || data?.error) {
      console.error('Enquiry submission failed:', functionError || data?.error)
      setTurnstileToken('')
      setVerificationKey((value) => value + 1)
      setStatus('Unable to send your enquiry right now. Please try again or email shuaibsgeneralcontractors@gmail.com.')
      return
    }

    formElement.reset()
    setTurnstileToken('')
    setVerificationKey((value) => value + 1)

    if (data?.notificationSent === false) {
      setStatus('Thank you. Your enquiry has been received. Our team will contact you shortly.')
      return
    }

    setStatus('Thank you. Your enquiry has been received and emailed to our team.')
  }

  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="Tell us what you would like to source."
        text="Share your selected S&S product, quantity, packaging and destination requirements. Our team will respond with the appropriate next steps."
      />

      <section className="contact section contact-page">
        <div className="contact-information">
          <p className="section-label">Start Trading</p>
          <h2>Let&apos;s discuss your requirement.</h2>
          <p>Please provide as much information as possible so the team can review availability and prepare an appropriate response.</p>

          <div className="contact-cards">
            <article><span>Email</span><a href="mailto:shuaibsgeneralcontractors@gmail.com">shuaibsgeneralcontractors@gmail.com</a></article>
            <article><span>Address</span><strong>63 Pent City Estate, Lokogoma, Abuja</strong></article>
            <article><span>Minimum Order</span><strong>1 × 20ft Container</strong></article>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input name="full_name" type="text" placeholder="Your name" maxLength="160" required />
          </label>
          <label>
            Company Name
            <input name="company_name" type="text" placeholder="Your company" maxLength="200" />
          </label>
          <label>
            Email Address
            <input name="email" type="email" placeholder="name@company.com" maxLength="254" required />
          </label>
          <label>
            Phone Number
            <input name="phone" type="tel" placeholder="Your phone number" maxLength="80" />
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
            <input name="destination_country" type="text" placeholder="Destination country" maxLength="120" />
          </label>
          <label>
            Message
            <textarea name="message" rows="6" placeholder="Product, quantity, packaging and other requirements" maxLength="5000" required />
          </label>
          <TurnstileWidget key={verificationKey} siteKey={turnstileSiteKey} onTokenChange={setTurnstileToken} />
          {status && <p className="form-status" role="status">{status}</p>}
          {!isSupabaseConfigured && <p className="form-status">Online enquiry storage is not configured.</p>}
          {isSupabaseConfigured && !turnstileSiteKey && (
            <p className="form-status">Online enquiry submission is temporarily unavailable. Please use the email address shown on this page.</p>
          )}
          <p className="form-legal-note">
            By submitting this form, you acknowledge our <Link to="/privacy-policy">Privacy Policy</Link> and
            {' '}<Link to="/terms-and-conditions">Terms &amp; Conditions</Link>.
          </p>
          <button
            className="primary-button"
            type="submit"
            disabled={submitting || !turnstileSiteKey || !turnstileToken}
          >
            {submitting ? 'Sending…' : 'Send Enquiry'}
          </button>
        </form>
      </section>
    </>
  )
}

export default ContactPage
