import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Admin.css'

function AdminChangePasswordPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    if (password.length < 10) {
      setError('Use a password with at least 10 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    const { data, error: functionError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'change-own-password', password },
    })
    setLoading(false)

    if (functionError || data?.error) {
      setError(data?.error || 'Unable to change your password.')
      return
    }

    navigate('/admin/dashboard', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return <main className="admin-state"><h1>Admin unavailable</h1><p>Supabase is not configured.</p></main>
  }
  if (session === undefined) return <main className="admin-state"><p>Checking account…</p></main>
  if (!session) return <Navigate to="/admin" replace />

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <p className="admin-kicker">Account security</p>
        <h1>Set a new password</h1>
        <p>Your administrator has required a password change before you continue.</p>
        <form onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type="password"
              minLength="10"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              minLength="10"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          {error && <div className="admin-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </main>
  )
}

export default AdminChangePasswordPage
