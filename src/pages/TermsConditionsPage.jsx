import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import './LegalPages.css'

function TermsConditionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal Information"
        title="Terms & Conditions"
        text="The terms governing access to this website, product enquiries, quotations and proposed transactions with Shuaib Sulaiman & Co."
      />

      <section className="legal-page section">
        <div className="legal-summary">
          <p className="section-label">Last updated</p>
          <h2>28 July 2026</h2>
          <p>
            By accessing this website or submitting an enquiry, you agree to these Terms & Conditions. Separate written commercial terms may apply to an accepted order.
          </p>
        </div>

        <div className="legal-content">
          <section>
            <h2>1. About us</h2>
            <p>
              This website is operated by Shuaib Sulaiman & Co, a Nigerian trading, export and consulting business located at
              {' '}<strong>63 Pent City Estate, Lokogoma, Abuja, Nigeria</strong>. You can contact us at
              {' '}<a href="mailto:info@shuaibsulaiman.com">info@shuaibsulaiman.com</a>.
            </p>
          </section>

          <section>
            <h2>2. Website purpose</h2>
            <p>
              The website provides general information about our business, services and selected S&S products. Website content is for preliminary
              information and enquiry purposes and does not, by itself, create a binding offer, sale, agency, partnership or supply agreement.
            </p>
          </section>

          <section>
            <h2>3. Product enquiries and quotations</h2>
            <ul>
              <li>Submitting an enquiry does not oblige either party to proceed with a transaction.</li>
              <li>A quotation is valid only for the period stated in the quotation and may be withdrawn or revised before acceptance.</li>
              <li>Prices, product availability, specifications, packaging, origin, quantity and delivery timelines remain subject to confirmation.</li>
              <li>A binding order exists only when the parties agree the applicable written commercial terms and any required payment or deposit is received.</li>
              <li>Where a signed contract, purchase order, pro forma invoice or other written transaction document conflicts with these website terms, the transaction-specific document takes priority.</li>
            </ul>
          </section>

          <section>
            <h2>4. Product information and samples</h2>
            <p>
              Product photographs, descriptions, specifications, colours, sizes, grades and packaging examples are illustrative unless expressly
              confirmed in writing. Agricultural and naturally sourced products may have reasonable variations between batches. Samples, certificates,
              laboratory analysis or inspection arrangements may be subject to availability, cost and separate agreement.
            </p>
          </section>

          <section>
            <h2>5. Minimum orders and availability</h2>
            <p>
              Unless otherwise agreed in writing, the website indicates a minimum order of one 20-foot container and a maximum of three 20-foot
              containers for a standard enquiry. Actual order limits may vary by product, season, regulation, destination, supplier capacity and logistics.
            </p>
          </section>

          <section>
            <h2>6. Pricing, taxes and payment</h2>
            <p>
              Prices are supplied through a formal quotation and may depend on grade, quantity, packaging, inspection, freight, insurance, exchange rates,
              duties, taxes and delivery terms. Customers are responsible for providing accurate billing and transaction information and for paying all
              amounts in accordance with the agreed invoice or contract. We will never require payment solely because a visitor viewed this website.
            </p>
          </section>

          <section>
            <h2>7. Shipping, customs and delivery</h2>
            <p>
              Delivery responsibilities, risk transfer, freight, insurance, export documentation, customs clearance, import permits, duties and destination
              charges will be defined in the applicable quotation or contract, including any agreed Incoterm. Estimated shipment or delivery dates are not
              guaranteed unless expressly stated in a signed agreement.
            </p>
          </section>

          <section>
            <h2>8. Buyer responsibilities</h2>
            <p>The buyer is responsible for:</p>
            <ul>
              <li>Providing complete and accurate specifications, destination, intended use and regulatory requirements.</li>
              <li>Confirming that the product may lawfully be imported, possessed, processed, distributed or used in the destination market.</li>
              <li>Obtaining required licences, permits, approvals, registrations and customs documentation assigned to the buyer.</li>
              <li>Reviewing and approving samples, labels, packaging, documents and specifications within agreed timelines.</li>
              <li>Using products lawfully and in accordance with applicable safety, environmental and industry requirements.</li>
            </ul>
          </section>

          <section>
            <h2>9. Inspection, acceptance and claims</h2>
            <p>
              Inspection, sampling, acceptance criteria and the time allowed for shortage, damage or quality claims will be stated in the transaction-specific
              terms. Customers should inspect goods promptly and preserve relevant packaging, photographs, reports and shipping documents when reporting a claim.
            </p>
          </section>

          <section>
            <h2>10. Acceptable website use</h2>
            <p>You must not:</p>
            <ul>
              <li>Use the website for fraud, unlawful trade, sanctions evasion or any prohibited activity.</li>
              <li>Submit false, misleading, abusive or malicious information.</li>
              <li>Attempt to gain unauthorised access to the website, administrator area, database or connected systems.</li>
              <li>Introduce malware, scrape the website excessively, interfere with its operation or misuse its content.</li>
              <li>Impersonate another person or misrepresent your authority to act for a business.</li>
            </ul>
          </section>

          <section>
            <h2>11. Intellectual property</h2>
            <p>
              Unless otherwise stated, the website design, text, product descriptions, graphics, logo and other original content belong to Shuaib Sulaiman & Co
              or are used with permission. You may view and print reasonable extracts for evaluating a legitimate business enquiry, but you may not reproduce,
              republish, sell, alter or exploit the content without written permission.
            </p>
          </section>

          <section>
            <h2>12. Third-party services and links</h2>
            <p>
              The website may rely on or link to third-party hosting, database, email, logistics, social-media or other services. We do not control third-party
              websites and are not responsible for their content, availability, security or privacy practices. Your use of a third-party service may be governed
              by that provider’s own terms.
            </p>
          </section>

          <section>
            <h2>13. Website availability and disclaimers</h2>
            <p>
              We aim to keep website information accurate and available, but we do not guarantee uninterrupted access or that every item will always be complete,
              current or error-free. We may correct content, change the catalogue, suspend features or withdraw the website without prior notice. Nothing on the
              website constitutes legal, tax, customs, investment, technical or regulatory advice.
            </p>
          </section>

          <section>
            <h2>14. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Shuaib Sulaiman & Co will not be liable for indirect, incidental, special or consequential loss
              arising solely from website use, inability to access the website, reliance on preliminary website content or third-party links. Nothing in these terms
              excludes liability that cannot lawfully be excluded. Liability relating to an accepted transaction will be governed by the applicable written contract.
            </p>
          </section>

          <section>
            <h2>15. Privacy</h2>
            <p>
              Personal information submitted through the website is handled according to our <Link to="/privacy-policy">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2>16. Changes to these terms</h2>
            <p>
              We may update these Terms & Conditions as the website, services or legal requirements change. The updated date at the top of this page identifies
              the latest version. Continued use of the website after an update means the revised terms apply to later use.
            </p>
          </section>

          <section>
            <h2>17. Governing law and disputes</h2>
            <p>
              These website terms are governed by the laws of the Federal Republic of Nigeria. The parties should first attempt in good faith to resolve a dispute
              through direct discussion. Unless a transaction-specific agreement states otherwise, Nigerian courts with jurisdiction in Abuja may determine an
              unresolved dispute.
            </p>
          </section>

          <div className="legal-contact-card">
            <h2>Questions about these terms?</h2>
            <p>Email <a href="mailto:info@shuaibsulaiman.com">info@shuaibsulaiman.com</a> or contact us at 63 Pent City Estate, Lokogoma, Abuja, Nigeria.</p>
            <Link className="primary-button" to="/contact">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default TermsConditionsPage
