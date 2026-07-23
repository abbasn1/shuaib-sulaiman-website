import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Admin.css'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Add the Cloudflare environment variables first.')
      return
    }

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/admin/dashboard', { replace: true })
  }

  if (session) return <Navigate to="/admin/dashboard" replace />

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <a className="admin-back-link" href="/">← Return to website</a>
        <p className="admin-kicker">Private administration</p>
        <h1>Admin sign in</h1>
        <p>Use your authorised email address and password.</p>

        {!isSupabaseConfigured && (
          <div className="admin-alert">Supabase environment variables are missing.</div>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error && <div className="admin-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}

export default AdminLoginPage
