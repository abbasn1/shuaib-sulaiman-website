import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Shuaib Sulaiman & Co"
        title="Connecting selected Nigerian products with global opportunity."
        text="From our Abuja office, we help international buyers source, inspect and move our focused range of S&S products with greater confidence."
      />

      <section className="story section inner-story">
        <div className="story-image-wrap">
          <img src="/images/story.jpg" alt="Shuaib Sulaiman and Company trade operations" />
          <div className="story-year"><strong>Abuja</strong><span>63 Pent City Estate, Lokogoma</span></div>
        </div>
        <div className="story-copy">
          <p className="section-label">Who We Are</p>
          <h2>Practical support across the full export journey.</h2>
          <p>
            Shuaib Sulaiman & Co is a Nigerian trading and export-support company working with buyers, distributors, processors, retailers and qualified industrial customers.
          </p>
          <p>
            Our product focus is S&S Shea Butter, S&S Garri, S&S Cashew Nut, S&S Ginger, S&S Charcoal, S&S Coal (Black) and S&S Yam Flour (Amala).
          </p>
          <p>
            Our work covers supplier identification, product inspection, packaging coordination, documentation, freight planning and shipment support.
          </p>
          <p>
            We aim to build long-term relationships through clear communication, responsible sourcing and disciplined delivery.
          </p>
        </div>
      </section>

      <section className="values-page section">
        <div className="section-heading">
          <div>
            <p className="section-label">Our Values</p>
            <h2>How we approach every transaction.</h2>
          </div>
        </div>
        <div className="why-grid values-grid">
          <article><span>01</span><h3>Integrity</h3><p>We communicate clearly and work to agreed specifications and commercial terms.</p></article>
          <article><span>02</span><h3>Quality Focus</h3><p>We coordinate checks, packaging and preparation based on buyer requirements.</p></article>
          <article><span>03</span><h3>Reliability</h3><p>We keep buyers informed and coordinate each stage from enquiry to shipment.</p></article>
          <article><span>04</span><h3>Responsible Sourcing</h3><p>We seek transparent relationships with producers, processors and supply partners.</p></article>
        </div>
      </section>

      <section className="process-section section">
        <div className="section-heading light">
          <div>
            <p className="section-label">Our Process</p>
            <h2>From product enquiry to international shipment.</h2>
          </div>
        </div>
        <div className="process-grid">
          <article><span>01</span><h3>Requirement Review</h3><p>We confirm product, quantity, specification, packaging and destination.</p></article>
          <article><span>02</span><h3>Sourcing & Verification</h3><p>We identify suppliers and coordinate quality and availability checks.</p></article>
          <article><span>03</span><h3>Quotation & Preparation</h3><p>Commercial terms, documentation and shipment preparation are agreed.</p></article>
          <article><span>04</span><h3>Logistics & Delivery</h3><p>We coordinate freight activities and provide shipment updates.</p></article>
        </div>
      </section>

      <section className="home-cta section">
        <div>
          <p className="section-label">Work With Us</p>
          <h2>Start a reliable sourcing relationship.</h2>
        </div>
        <Link className="primary-button" to="/contact">Contact Our Team</Link>
      </section>
    </>
  )
}

export default AboutPage
