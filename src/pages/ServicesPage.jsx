import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { services } from '../data'

function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Services"
        title="Support across sourcing, export preparation and delivery."
        text="Our service model helps buyers navigate Nigerian product sourcing and international shipment coordination."
      />

      <section className="services service-page section">
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

      <section className="service-details section">
        <div className="section-heading">
          <div>
            <p className="section-label">How We Help</p>
            <h2>Clear coordination at every stage.</h2>
          </div>
        </div>
        <div className="service-detail-grid">
          <article><h3>Buyer Requirement Assessment</h3><p>We review specifications, quantities, packaging, documentation and destination requirements.</p></article>
          <article><h3>Supplier & Product Coordination</h3><p>We engage suitable suppliers and coordinate samples, availability and quality checks.</p></article>
          <article><h3>Export Documentation Support</h3><p>We support preparation and coordination of relevant commercial and shipping documentation.</p></article>
          <article><h3>Freight & Shipment Coordination</h3><p>We work with logistics partners to organise cargo movement and communicate shipment status.</p></article>
          <article><h3>Packaging & Labelling</h3><p>Buyer requirements for pack size, labelling and shipment presentation are coordinated before dispatch.</p></article>
          <article><h3>Ongoing Buyer Support</h3><p>We remain available throughout the transaction to resolve questions and provide updates.</p></article>
        </div>
      </section>

      <section className="home-cta section">
        <div>
          <p className="section-label">Discuss Your Requirement</p>
          <h2>Need sourcing or export support?</h2>
        </div>
        <Link className="primary-button" to="/contact">Request a Consultation</Link>
      </section>
    </>
  )
}

export default ServicesPage
