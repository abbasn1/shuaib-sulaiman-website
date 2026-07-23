import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="not-found section">
      <p className="section-label">404 Error</p>
      <h1>We could not find that page.</h1>
      <p>The page may have moved or the address may be incorrect.</p>
      <Link className="primary-button" to="/">Return Home</Link>
    </section>
  )
}

export default NotFoundPage
