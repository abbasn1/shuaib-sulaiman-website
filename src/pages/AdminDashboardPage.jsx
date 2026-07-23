import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Admin.css'

const statuses = ['new', 'under_review', 'contacted', 'quotation_sent', 'won', 'lost', 'closed']

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      setLoading(false)
      return
    }

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const currentSession = sessionData.session
      setSession(currentSession)

      if (!currentSession) {
        setLoading(false)
        return
      }

      const [{ data: profileData, error: profileError }, { data: quoteData, error: quoteError }] = await Promise.all([
        supabase.from('profiles').select('full_name,email,role,is_active').eq('id', currentSession.user.id).single(),
        supabase.from('quotes').select('*').order('created_at', { ascending: false }),
      ])

      if (profileError) setError(profileError.message)
      else if (!profileData?.is_active) setError('This administrator account is inactive.')
      else setProfile(profileData)

      if (quoteError) setError((current) => current || quoteError.message)
      else setQuotes(quoteData ?? [])

      setLoading(false)
    }

    load()
  }, [])

  const visibleQuotes = useMemo(
    () => filter === 'all' ? quotes : quotes.filter((quote) => quote.status === filter),
    [filter, quotes],
  )

  const updateStatus = async (id, status) => {
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setQuotes((items) => items.map((item) => item.id === id ? { ...item, status } : item))
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    navigate('/admin', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return <main className="admin-state"><h1>Admin unavailable</h1><p>Add the Supabase environment variables in Cloudflare Pages.</p></main>
  }

  if (loading || session === undefined) return <main className="admin-state"><p>Loading dashboard…</p></main>
  if (!session) return <Navigate to="/admin" replace />

  return (
    <main className="admin-dashboard-shell">
      <header className="admin-dashboard-header">
        <div>
          <p className="admin-kicker">Shuaib Sulaiman & Co.</p>
          <h1>Enquiry dashboard</h1>
          <p>{profile ? `${profile.full_name} · ${profile.role}` : session.user.email}</p>
        </div>
        <div className="admin-header-actions">
          <a href="/">View website</a>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {error && <div className="admin-error admin-wide-error">{error}</div>}

      <section className="admin-summary-grid">
        <article><strong>{quotes.length}</strong><span>Total enquiries</span></article>
        <article><strong>{quotes.filter((quote) => quote.status === 'new').length}</strong><span>New</span></article>
        <article><strong>{quotes.filter((quote) => quote.status === 'won').length}</strong><span>Won</span></article>
        <article><strong>{quotes.filter((quote) => quote.status === 'closed').length}</strong><span>Closed</span></article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Customer enquiries</h2>
            <p>Review product requests and update their progress.</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>Product</th><th>Destination</th><th>Contact</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td>{new Date(quote.created_at).toLocaleDateString()}</td>
                  <td><strong>{quote.full_name}</strong><span>{quote.company_name || 'Individual buyer'}</span><small>{quote.message}</small></td>
                  <td>{quote.product_name || quote.service_type || 'General enquiry'}</td>
                  <td>{quote.destination_country || quote.project_location || 'Not specified'}</td>
                  <td><a href={`mailto:${quote.email}`}>{quote.email}</a><span>{quote.phone || 'No phone'}</span></td>
                  <td>
                    <select value={quote.status} onChange={(event) => updateStatus(quote.id, event.target.value)}>
                      {statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!visibleQuotes.length && <tr><td colSpan="6" className="admin-empty">No enquiries found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default AdminDashboardPage
